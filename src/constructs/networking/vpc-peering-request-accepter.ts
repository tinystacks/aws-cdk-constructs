import { AwsCustomResource, AwsCustomResourcePolicy, AwsSdkCall, PhysicalResourceId } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';

export interface VpcPeeringRequestAccepterProps {
  peeringConnectionId: string
  vpcArn: string
  accountId: string
  region: string
}

export class VpcPeeringRequestAccepter extends AwsCustomResource {
  constructor (scope: Construct, id: string, props: VpcPeeringRequestAccepterProps) {
    const {
      vpcArn,
      peeringConnectionId,
      accountId,
      region
    } = props;

    const acceptPeeringConnection: AwsSdkCall = {
      service: 'EC2',
      action: 'acceptVpcPeeringConnection',
      parameters: {
        VpcPeeringConnectionId: peeringConnectionId
      },
      physicalResourceId: PhysicalResourceId.of(id)
    };

    const policy = AwsCustomResourcePolicy.fromSdkCalls({
      resources: [
        vpcArn,
        `arn:aws:ec2:${region}:${accountId}:vpc-peering-connection/*`
      ]
    });

    super(scope, id, {
      onCreate: acceptPeeringConnection,
      onUpdate: acceptPeeringConnection,
      policy
    });
  }
}
