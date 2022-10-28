import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { Construct } from 'constructs';
import { constructId } from '@tinystacks/iac-utils';

export interface EcsClusterProps {
  clusterName: string;
  vpc: ec2.Vpc;
  instanceType: ec2.InstanceType;
  machineImage: ec2.IMachineImage;
  desiredCapacity: number;
}

export class EcsCluster extends Construct {

  public readonly ecsCluster: ecs.Cluster;

  constructor (scope: Construct, id: string, props: EcsClusterProps) {
    super (scope, id);

    this.ecsCluster = new ecs.Cluster(this, constructId('ecs', 'Cluster'), {
      clusterName: props.clusterName,
      vpc: props.vpc
    });

    this.ecsCluster.addCapacity(constructId('ecs', 'Cluster', 'AddCapacity'), {
      instanceType: props.instanceType,
      machineImage: props.machineImage,
      desiredCapacity: props.desiredCapacity
    });
  
  }
}