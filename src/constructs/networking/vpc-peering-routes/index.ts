import { constructId } from '@tinystacks/iac-utils';
import { CustomResource, Duration } from 'aws-cdk-lib';
import { PolicyDocument, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { InlineCode, Runtime, Function } from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import fs from 'fs';
import path from 'path';

interface VpcPeeringRoutesProps {
  vpcId: string
  peeringConnectionId: string
  destinationCidrBlock: string
  accountId: string
  region: string
  uniqueId: string
}

export class VpcPeeringRoutes extends Construct {
  public readonly response: any;
  constructor (scope: Construct, id: string, props: VpcPeeringRoutesProps) {
    super(scope, id);

    const {
      accountId,
      region
    } = props;

    const role = new Role(this, constructId(id, 'role'), {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        functionPolicy: new PolicyDocument({
          statements: [
            new PolicyStatement({
              actions: [
                'ec2:DescribeRouteTables'
              ],
              resources: ['*']
            }),
            new PolicyStatement({
              actions: [
                'ec2:CreateRoute',
                'ec2:DeleteRoute'
              ],
              resources: [`arn:aws:ec2:${region}:${accountId}:route-table/*`]
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
    const fn = new Function(this, constructId(id, 'lambdaFunction'), {
      code: new InlineCode(
        fs.readFileSync(path.resolve(__dirname, './lambda.js'), { encoding: 'utf-8' })
      ),
      handler: 'index.handler',
      timeout: Duration.seconds(300),
      runtime: Runtime.NODEJS_16_X,
      role,
      logRetention: RetentionDays.THREE_MONTHS
    });

    const provider = new Provider(this, 'Provider', {
      onEventHandler: fn
    });

    const resource = new CustomResource(this, 'Resource', {
      serviceToken: provider.serviceToken,
      properties: props
    });

    this.response = resource.getAtt('Response').toString();
  }
}
