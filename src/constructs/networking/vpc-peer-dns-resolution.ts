import { AwsCustomResource, AwsCustomResourcePolicy, AwsSdkCall, PhysicalResourceId } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';

export interface VpcPeerDnsResolutionProps {
  peeringConnectionId: string
  vpcArn: string
  accountId: string
  region: string
  isRequester?: boolean
  isAccepter?: boolean
}

export class VpcPeerDnsResolution extends AwsCustomResource {
  constructor (scope: Construct, id: string, props: VpcPeerDnsResolutionProps) {
    const {
      peeringConnectionId,
      vpcArn,
      accountId,
      region,
      isRequester,
      isAccepter
    } = props;

    const enableDnsResolution: AwsSdkCall = {
      service: 'EC2',
      action: 'modifyVpcPeeringConnectionOptions',
      parameters: {
        VpcPeeringConnectionId: peeringConnectionId
      },
      physicalResourceId: PhysicalResourceId.of(id)
    };

    const disableDnsResolution: AwsSdkCall = {
      service: 'EC2',
      action: 'modifyVpcPeeringConnectionOptions',
      parameters: {
        VpcPeeringConnectionId: peeringConnectionId
      }
    };

    if (isRequester) {
      enableDnsResolution.parameters.RequesterPeeringConnectionOptions = {
        AllowDnsResolutionFromRemoteVpc: true
      };
      disableDnsResolution.parameters.RequesterPeeringConnectionOptions = {
        AllowDnsResolutionFromRemoteVpc: false
      };
    }

    if (isAccepter) {
      enableDnsResolution.parameters.AccepterPeeringConnectionOptions = {
        AllowDnsResolutionFromRemoteVpc: true
      };
      disableDnsResolution.parameters.AccepterPeeringConnectionOptions = {
        AllowDnsResolutionFromRemoteVpc: false
      };
    }

    const policy = AwsCustomResourcePolicy.fromSdkCalls({
      resources: [
        vpcArn,
        `arn:aws:ec2:${region}:${accountId}:vpc-peering-connection/*`
      ]
    });

    super(scope, id, {
      onCreate: enableDnsResolution,
      onUpdate: enableDnsResolution,
      onDelete: disableDnsResolution,
      policy
    });
  }
}