import * as cdk from 'aws-cdk-lib';
import { EcsCluster } from '../../../../src/constructs/compute/ecs-cluster';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { VPC, ExternalVpcPeer, EcsService, EcsServiceProps } from '../../../../src';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Secret } from 'aws-cdk-lib/aws-ecs';

/*
*Create the ECS cluster and also use VPC peering. Creates a VPC if no VPC is provided.
*/

interface EcsStackProps extends cdk.StackProps {
  clusterName: string;
  vpc?: ec2.IVpc;
  externalPeers?: ExternalVpcPeer[];
  internetAccess: boolean;
  internalPeers?: VPC[];
  ecsServices: ecsStackProps[];
}

// Allows providing a security group ID on the app level instead of the types ec2.SecurityGroup | ec2.ISecurityGroup
// reason for this is you probably don't wanna instiantiate the SecurityGroup class on the app level.
export interface ecsStackProps extends Omit<EcsServiceProps,'vpc'|'ecsSecurityGroup'|'ecsCluster'>{
  ecsSecurityGroupId?: string;
}

export class EcsStack extends cdk.Stack {
  private _vpc: ec2.IVpc;

  constructor(scope: cdk.App, id: string, props: EcsStackProps) {
    super(scope, id, props);


    const {
      clusterName,
      vpc,
      externalPeers,
      internalPeers,
      internetAccess,
      ecsServices
    } = props;

    // If vpc is not provided then create a vpc.
    if (vpc === undefined) {
      this._vpc = new VPC(this, `${id}-vpc`, { internetAccess: internetAccess, internalPeers: internalPeers, externalPeers: externalPeers }).vpc;
      const ecsCluster = new EcsCluster(this, `${id}-cluster`, { clusterName: clusterName, vpc: this._vpc }).ecsCluster;

      ecsServices.forEach((value) => {
        // Check if security group ID is provided to import, if not, create one.
        const securityGroup = value.ecsSecurityGroupId !== undefined ? ec2.SecurityGroup.fromSecurityGroupId(
          this,
          `${id}-imported-sg`,
          value.ecsSecurityGroupId,
          { allowAllOutbound: true, mutable: true },
        ) : new ec2.SecurityGroup(this, `${id}-sg`, { vpc: this._vpc });
        new EcsService(this, `${id}-ecs`, { containerName: value.containerName, vpc: this._vpc, ecsCluster: ecsCluster, memoryLimitMiB: value.memoryLimitMiB, cpu: value.cpu, desiredCount: value.desiredCount, applicationPort: value.applicationPort, ecsSecurityGroup: securityGroup, containerImage: "nginx", ecsIamPolicyStatements: value.ecsIamPolicyStatements, ecsTaskEnvVars: value.ecsTaskEnvVars, secrets: value.secrets, command: value.command, repositoryImage: value.repositoryImage });
      });
    }

  }

}