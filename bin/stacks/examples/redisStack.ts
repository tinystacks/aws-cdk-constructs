import * as cdk from 'aws-cdk-lib';
import { Redis } from '../../../src/constructs/db/redis';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class RedisStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string) {
        super(scope, id)
        const vpc = ec2.Vpc.fromVpcAttributes(this, 'vpc', { vpcId: 'vpc-0b4062306eb4cac1b', availabilityZones: ['us-west-2a','us-west-2b'] })
        const subnets = [ec2.Subnet.fromSubnetId(this, 'sub1', 'subnet-084196d162c950277'), ec2.Subnet.fromSubnetId(this, 'sub2', 'subnet-0ce2d72532a15d99e')]
        const secG = [ec2.SecurityGroup.fromLookupById(this, 'sg1', 'sg-0aa4ac3b0ebefd83a')]
        const redisStack = new Redis(this, 'redisStack', { vpc: vpc, subnets: subnets, securityGroupsList: secG, dbIdentifier: 'redis1' })
    }
}