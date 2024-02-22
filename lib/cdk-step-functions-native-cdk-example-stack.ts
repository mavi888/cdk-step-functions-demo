import * as cdk from 'aws-cdk-lib';
import {
	PolicyDocument,
	PolicyStatement,
	Role,
	ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Chain, JitterType, StateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';

import { Construct } from 'constructs';
import * as config from '../config.json';
import { HttpApi } from 'aws-cdk-lib/aws-apigatewayv2';

export class CdkStepFunctionsNativeCDKExampleStack extends cdk.Stack {
	constructor(scope: Construct, id: string, props?: cdk.StackProps) {
		super(scope, id, props);

		const policyPublishTopic = new PolicyDocument({
			statements: [
				new PolicyStatement({
					actions: ['sns:Publish'],
					resources: [config.notificationTopic],
				}),
			],
		});

		const policyAccessAPIGateway = new PolicyDocument({
			statements: [
				new PolicyStatement({
					actions: ['apigateway:*'],
					resources: [config.apiGatewayARN],
				}),
			],
		});

		const stateMachineRole = new Role(this, 'stateMachineRole', {
			assumedBy: new ServicePrincipal('states.amazonaws.com'),
			inlinePolicies: {
				policyAccessAPIGateway,
				policyPublishTopic,
			},
		});

		const httpAPI = HttpApi.fromHttpApiAttributes(this, 'broken-API', {
			httpApiId: config.apiId,
		});

		const invokeHttpEndpoint = new tasks.CallApiGatewayHttpApiEndpoint(
			this,
			'invokeAPIGatewayHttpEndpoint',
			{
				apiId: config.apiId,
				apiStack: httpAPI.stack,
				method: tasks.HttpMethod.GET,
				apiPath: config.apiPath,
			}
		);

		invokeHttpEndpoint.addRetry({
			errors: ['ApiGateway.400'],
			backoffRate: 2,
			interval: cdk.Duration.seconds(2),
			maxAttempts: 1,
			jitterStrategy: JitterType.FULL,
		});

		const sendNotification = new tasks.CallAwsService(this, 'callSNS', {
			service: 'sns',
			action: 'publish',
			parameters: {
				Message: '$',
				TopicArn: config.notificationTopic,
			},
			iamResources: ['*'],
		});

		invokeHttpEndpoint.addCatch(sendNotification, {
			errors: ['ApiGateway.400'],
		});

		const workflow = new StateMachine(this, 'StateMachineFromChain', {
			role: stateMachineRole,
			definition: Chain.start(invokeHttpEndpoint),
		});
	}
}
