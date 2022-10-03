import * as fs from 'fs';
import * as path from 'path';
import { Construct } from 'constructs';
import { constructId } from '@tinystacks/iac-utils';
import { PolicyDocument, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Function, InlineCode, Runtime } from 'aws-cdk-lib/aws-lambda';
import { CustomResource, Duration } from 'aws-cdk-lib';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';

export interface EksCleanupProps {
  vpcId: string;
  clusterName: string;
}

export class EksCleanup extends Construct {
  public readonly response: any;

  constructor (scope: Construct, id: string, props: EksCleanupProps) {
    super(scope, id);

    const role = new Role(this, constructId('EksCleanupRole'), {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        functionPolicy: new PolicyDocument({
          statements: [
            new PolicyStatement({
              actions: [
                'ec2:DescribeNetworkInterfaces',
                'ec2:DeleteNetworkInterface',
                'ec2:DescribeSecurityGroups',
                'ec2:DeleteSecurityGroup'
              ],
              resources: ['*']
            })
          ]
        })
      },
      managedPolicies: [
        {
          managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
        }
      ]
    });
    const fn = new Function(this, constructId('EksCleanupLambdaFunction'), {
      code: new InlineCode(
        fs.readFileSync(path.resolve(__dirname, './lambda.js'), { encoding: 'utf-8' })
      ),
      handler: 'index.handler',
      timeout: Duration.seconds(300),
      runtime: Runtime.NODEJS_16_X,
      role,
      logRetention: RetentionDays.THREE_MONTHS
    });

    const provider = new Provider(this, 'EksCleanupProvider', {
      onEventHandler: fn
    });

    const resource = new CustomResource(this, 'EksCleanupResource', {
      serviceToken: provider.serviceToken,
      properties: props
    });

    this.response = resource.getAtt('Response').toString();
  }
}