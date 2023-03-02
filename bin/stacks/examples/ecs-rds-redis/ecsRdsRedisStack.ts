import { constructId } from '@tinystacks/iac-utils';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as cdk from 'aws-cdk-lib';
import {
  VPC,
  Rds,
  EcsService,
  EcsCluster,
  Redis,
  SecurityGroups
} from '../../../../src';

export class EcsRdsRedisStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string) {
        super(scope, id)
        
        // Create VPC
        const vpcConstruct = new VPC(this, constructId('AJVpcStack'), {
          internetAccess: true
        });
        
        // Create Security Group
        const sgRules = [
          { name: 'SSH', port: ec2.Port.tcp(22), peer: ec2.Peer.anyIpv4() },
          { name: 'HTTP', port: ec2.Port.tcp(80), peer: ec2.Peer.anyIpv4() },
          { name: 'HTTPS', port: ec2.Port.tcp(443), peer: ec2.Peer.anyIpv4() },
          { name: 'Postgres', port: ec2.Port.tcp(5432), peer: ec2.Peer.anyIpv4() },
          { name: 'Redis', port: ec2.Port.tcp(6379), peer: ec2.Peer.anyIpv4() },
          { name: 'EcsApp', port: ec2.Port.tcp(3000), peer: ec2.Peer.anyIpv4() },
        ]

        const commonSecurityGroupStack = new SecurityGroups(this, 'commonSecurityGroupsStack', {
          vpc: vpcConstruct.vpc,
          securityGroupName: 'common',
          securityGroupRulesList: sgRules
        });

        // Create RDS Postgres

        const rdsConstruct = new Rds(this, constructId('AJRdsStack'), {
          instanceIdentifier: 'AJRds',
          vpc: vpcConstruct.vpc,
          databaseEngine: rds.DatabaseInstanceEngine.POSTGRES,
          securityGroupsList: [commonSecurityGroupStack.securityGroup],
          instanceType: ec2.InstanceType.of(
            ec2.InstanceClass.BURSTABLE3,
            ec2.InstanceSize.MICRO,
          ),
          databaseName: 'ajtesting',
          subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
        });

        // Create ElastiCache Redis

        const redisConstruct = new Redis(this, constructId('AJRedisStack'), {
          dbIdentifier: 'AJRedis',
          vpc: vpcConstruct.vpc,
          primaryVpcCidrBlock: vpcConstruct.cidrBlock,
          securityGroupsList: [commonSecurityGroupStack.securityGroup],
          subnets: vpcConstruct.vpc.privateSubnets,
        });

        // Create ECS Cluster and App

        const ecsClusterConstruct = new EcsCluster(this, constructId('AJEcsClusterStack'), {
          clusterName: 'AJEcsCluster',
          vpc: vpcConstruct.vpc,
        });

        new EcsService(this, constructId('AJEcsServiceStack'), {
          ecsCluster: ecsClusterConstruct.ecsCluster,
          containerName: "hello-world-app",
          containerImage: "public.ecr.aws/tinystacks/aws-docker-templates-express:latest-x86",
          memoryLimitMiB: 2048,
          cpu: 1024,
          desiredCount: 1,
          applicationPort: 3000,
          ecsSecurityGroup: commonSecurityGroupStack.securityGroup,
          ecsIamPolicyStatements: [new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["SES:*"],
            resources: ["*"],
          })],
          ecsTaskEnvVars: {
            'DB_HOST': rdsConstruct.db.dbInstanceEndpointAddress,
            'DB_PORT': rdsConstruct.db.dbInstanceEndpointPort,
            'DB_SECRET_ARN': rdsConstruct.dbSecret?.secretName,
            'DB_NAME': rdsConstruct.dbName,
            'DB_USERNAME': rdsConstruct.dbUsername,
            'REDIS_ENDPOINT': redisConstruct.redisEndpoint,
            'REDIS_PORT': redisConstruct.redisPort,
            'REDIS_SECRET_ARN': redisConstruct.redisAuthTokenSecretArn
          }

        });

    }
}
