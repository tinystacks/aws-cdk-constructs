#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';

import { EksRdsStack } from './eksRdsStack';

const app = new cdk.App();
new EksRdsStack(app, 'EksRdsStack');