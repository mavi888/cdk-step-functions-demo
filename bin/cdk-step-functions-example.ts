#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CdkStepFunctionsExampleStack } from '../lib/cdk-step-functions-example-stack';
import { CdkStepFunctionsNativeCDKExampleStack } from '../lib/cdk-step-functions-native-cdk-example-stack';

const app = new cdk.App();
new CdkStepFunctionsExampleStack(app, 'CdkStepFunctionsExampleStack', {});
new CdkStepFunctionsNativeCDKExampleStack(
	app,
	'CdkStepFunctionsNativeCDKExampleStack',
	{}
);
