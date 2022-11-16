import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';
import { constructId } from '@tinystacks/iac-utils';

export interface EcsServiceProps {
  containerName: string;
  vpc: ec2.IVpc;
  ecsCluster: ecs.Cluster;
  containerImage: string;
  memoryLimitMiB: number;
  cpu: number;
  desiredCount: number;
  applicationPort: number;
  ecsSecurityGroup: ec2.SecurityGroup;
  ecsIamPolicyStatements: iam.PolicyStatement[];
  albTargetGroup: elbv2.ApplicationTargetGroup;
  ecsTaskEnvVars: { [key: string]: string; };
}

export class EcsService extends Construct {

  constructor (scope: Construct, id: string, props: EcsServiceProps) {
    super (scope, id);

    const ecsTaskRole = new iam.Role(this, constructId('ecs', 'TaskRole'), {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      roleName: 'ecs-task-role',
      description: 'Role that the api task definitions use'
    });

    ecsTaskRole.attachInlinePolicy(
      new iam.Policy(this, constructId('ecs', 'TaskPolicy'), {
        statements: props.ecsIamPolicyStatements
      })
    );

    const ecsTaskDefinition = new ecs.TaskDefinition(this, constructId('ecs', 'TaskDefinition'), {
      family: 'task',
      compatibility: ecs.Compatibility.EC2_AND_FARGATE,
      cpu: String(props.cpu),
      memoryMiB: String(props.memoryLimitMiB),
      networkMode: ecs.NetworkMode.AWS_VPC,
      taskRole: ecsTaskRole,
    });

    const ecsContainer = ecsTaskDefinition.addContainer(constructId('ecs', 'Container'), {
      containerName: props.containerName,
      image: ecs.RepositoryImage.fromRegistry(props.containerImage),
      memoryLimitMiB: props.memoryLimitMiB,
      environment: props.ecsTaskEnvVars,
      logging: ecs.LogDriver.awsLogs({ streamPrefix: props.containerName }),
      privileged: true
    });

    ecsContainer.addPortMappings({ containerPort: props.applicationPort });

    const ecsService = new ecs.FargateService(this, constructId('ecs', 'FargfateService'), {
      cluster: props.ecsCluster,
      desiredCount: props.desiredCount,
      taskDefinition: ecsTaskDefinition,
      securityGroups: [props.ecsSecurityGroup],
      assignPublicIp: true,
      enableExecuteCommand: true
    });

    ecsService.attachToApplicationTargetGroup(props.albTargetGroup);
  
  }

}