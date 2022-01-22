#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PipelineStack } from '../lib/pipeline-stack';
import {CodePipelineStack} from "../lib/codepipeline-stack";

const app = new cdk.App();
new PipelineStack(app, 'DiplomacyPipelineStack');
new CodePipelineStack(app, 'DiplomacyCodePipelineStack')