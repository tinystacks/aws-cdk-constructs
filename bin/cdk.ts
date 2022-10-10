#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { S3Creation } from './stacks/s3Creation';

const app = new cdk.App();

new S3Creation(app, 'testS3', { env: { account: '759747741894', region: 'us-west-2'}, existingBucketArn: "arn:aws:s3:::existing-bucket-test-1"});