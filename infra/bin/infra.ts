#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {CodePipelineStack} from "../lib/codepipeline-stack";

const app = new cdk.App();
new CodePipelineStack(app, 'DiplomacyCodePipelineStack')