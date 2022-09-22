import * as cdk from '@aws-cdk/core';
import { AwsCustomResource, AwsCustomResourcePolicy, AwsSdkCall, PhysicalResourceId } from '@aws-cdk/custom-resources';

export interface VpcPeerDnsResolutionProps {
  peeringConnectionId: string,
  isRequester?: boolean,
  isAccepter?: boolean
}

export class VpcPeerDnsResolution extends AwsCustomResource {
  constructor (scope: cdk.Construct, id: string, props: VpcPeerDnsResolutionProps) {
    const {
      peeringConnectionId,
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
      enableDnsResolution.parameters['RequesterPeeringConnectionOptions'] = {
        AllowDnsResolutionFromRemoteVpc: true
      };
      disableDnsResolution.parameters['RequesterPeeringConnectionOptions'] = {
        AllowDnsResolutionFromRemoteVpc: false
      };
    }

    if (isAccepter) {
      enableDnsResolution.parameters['AccepterPeeringConnectionOptions'] = {
        AllowDnsResolutionFromRemoteVpc: true
      };
      disableDnsResolution.parameters['AccepterPeeringConnectionOptions'] = {
        AllowDnsResolutionFromRemoteVpc: false
      };
    }

    const policy = AwsCustomResourcePolicy.fromSdkCalls({
      resources: AwsCustomResourcePolicy.ANY_RESOURCE
    });

    super(scope, id, {
      onCreate: enableDnsResolution,
      onUpdate: enableDnsResolution,
      onDelete: disableDnsResolution,
      policy
    });
  }
}