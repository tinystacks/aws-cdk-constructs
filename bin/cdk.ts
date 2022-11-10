#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from '@aws-cdk/aws-ec2';
import { Rds } from '/Users/nefertitirogers/Projects/tinystacks-aws-cdk-constructs/src/constructs/rds/postgres'

const app = new cdk.App();
