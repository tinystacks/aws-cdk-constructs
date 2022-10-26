import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';

export interface EcsServiceProps {
  containerName: string;
  vpc: ec2.Vpc;
  ecsCluster: ecs.Cluster;
  containerImage: string;
  memoryLimitMiB: number;
  cpu: number;
  desiredCount: number;
  applicationPort: number;
  ecsSecurityGroup: ec2.SecurityGroup;
  targetGroup: elbv2.ApplicationTargetGroup;
  ecsTaskEnvVars: { [key: string]: string; };
}

export class EcsService extends Construct {

  constructor (scope: Construct, id: string, props: EcsServiceProps) {
    super (scope, id);

    const ecsTaskRole = new iam.Role(this, 'ecs-task-role', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      roleName: 'ecs-task-role',
      description: 'Role that the api task definitions use'
    });

    ecsTaskRole.attachInlinePolicy(
      new iam.Policy(this, 'ecs-task-policy', {
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['SES:*'],
            resources: ['*']
          })
        ]
      })
    );

    const ecsTaskDefinition = new ecs.TaskDefinition(this, 'ecs-task-definition', {
      family: 'task',
      compatibility: ecs.Compatibility.EC2_AND_FARGATE,
      cpu: String(props.cpu),
      memoryMiB: String(props.memoryLimitMiB),
      networkMode: ecs.NetworkMode.AWS_VPC,
      taskRole: ecsTaskRole
    });

    const ecsContainer = ecsTaskDefinition.addContainer('ecs-container', {
      containerName: props.containerName,
      image: ecs.RepositoryImage.fromRegistry(props.containerImage),
      memoryLimitMiB: props.memoryLimitMiB,
      environment: props.ecsTaskEnvVars,
      logging: ecs.LogDriver.awsLogs({ streamPrefix: props.containerName })
    });

    ecsContainer.addPortMappings({ containerPort: props.applicationPort });

    const ecsService = new ecs.FargateService(this, 'ecs-fargfate-service', {
      cluster: props.ecsCluster,
      desiredCount: props.desiredCount,
      taskDefinition: ecsTaskDefinition,
      securityGroups: [props.ecsSecurityGroup],
      assignPublicIp: true
    });

    ecsService.attachToApplicationTargetGroup(props.targetGroup);
  
  }

}