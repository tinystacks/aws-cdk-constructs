import { constructId } from '@tinystacks/iac-utils';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as cdk from 'aws-cdk-lib';
import {
  VPC,
  EKS,
  EksHelmChart,
  Rds,
  SecurityGroups
} from '../../../../src';

export class EksRdsStack extends cdk.Stack {
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
        
        // Launch EKS cluster

        const eksConstruct = new EKS(this, 'AJEksStack', {
          clusterName: 'AJEksCluster',
          vpc: vpcConstruct.vpc,
          internetAccess: true
        });

        // Deploy Helm Chart

        new EksHelmChart(this, 'AJHelmChart', {
          eksCluster: eksConstruct.cluster,
          chartName: 'hello-world',
          repository: 'https://helm.github.io/examples',
          values: {
            'DB_HOST': rdsConstruct.db.dbInstanceEndpointAddress,
            'DB_PORT': rdsConstruct.db.dbInstanceEndpointPort,
            'DB_SECRET_ARN': rdsConstruct.dbSecret?.secretName,
            'DB_NAME': rdsConstruct.dbName,
            'DB_USERNAME': rdsConstruct.dbUsername
          }
        })

        
    }
}