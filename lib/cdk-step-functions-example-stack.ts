import * as cdk from 'aws-cdk-lib';
import {
	Policy,
	PolicyDocument,
	PolicyStatement,
	Role,
	ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { DefinitionBody, StateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';
import * as config from '../config.json';

export class CdkStepFunctionsExampleStack extends cdk.Stack {
	constructor(scope: Construct, id: string, props?: cdk.StackProps) {
		super(scope, id, props);

		const policyHttpEndpoint = new PolicyDocument({
			statements: [
				new PolicyStatement({
					actions: ['states:InvokeHTTPEndpoint'],
					resources: ['*'],
				}),
			],
		});

		const policyGetSecret = new PolicyDocument({
			statements: [
				new PolicyStatement({
					actions: [
						'secretsmanager:GetSecretValue',
						'secretsmanager:DescribeSecret',
					],
					resources: ['arn:aws:secretsmanager:*:*:secret:events!connection/*'],
				}),
			],
		});

		const policyRetrieveConnection = new PolicyDocument({
			statements: [
				new PolicyStatement({
					actions: ['events:RetrieveConnectionCredentials'],
					resources: [config.connectionArn],
				}),
			],
		});

		const policyPublishTopic = new PolicyDocument({
			statements: [
				new PolicyStatement({
					actions: ['sns:Publish'],
					resources: [config.notificationTopic],
				}),
			],
		});

		const stateMachineRole = new Role(this, 'stateMachineRole', {
			assumedBy: new ServicePrincipal('states.amazonaws.com'),
			inlinePolicies: {
				policyHttpEndpoint,
				policyGetSecret,
				policyRetrieveConnection,
				policyPublishTopic,
			},
		});

		const workflow = new StateMachine(this, 'StateMachineFromFile', {
			definitionBody: DefinitionBody.fromFile('./lib/statemachine.asl.json'),
			role: stateMachineRole,
			definitionSubstitutions: {
				Endpoint: config.httpEndpoint,
				ConnectionARN: config.connectionArn,
				NotificationTopic: config.notificationTopic,
			},
		});
	}
}
