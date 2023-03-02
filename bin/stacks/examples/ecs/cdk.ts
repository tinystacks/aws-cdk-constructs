import { EcsStack } from './EcsStack';
import * as cdk from 'aws-cdk-lib';
import { EcsServiceProps } from '../../../../src';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';

const app = new cdk.App();
// assuming we have an external vpc
const vpcId = "vpc-06ee3bf86858b4518";


new EcsStack(app, 'EcsStack', { env: { account: '759747741894', region: 'us-east-1' },
    clusterName: "test", externalPeers: [{ vpcId: vpcId, cidrBlock: "10.0.10.0/24" }], internetAccess: true,
    ecsServices: [{ containerName: `test`, memoryLimitMiB: 2048, cpu: 1024, desiredCount: 2, applicationPort: 8080, containerImage: "nginx", ecsIamPolicyStatements: [], ecsTaskEnvVars: {} }]
});