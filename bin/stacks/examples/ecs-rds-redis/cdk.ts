#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';

import { EcsRdsRedisStack } from './ecsRdsRedisStack';

const app = new cdk.App();
new EcsRdsRedisStack(app, 'EcsRdsRedisStack');