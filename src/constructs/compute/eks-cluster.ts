import { Construct } from 'constructs';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';


interface EksProps {
    vpc: ec2.IVpc
    internetAccess: boolean
}

export class EKS extends Construct {
    id: string
    _cluster: eks.Cluster
    _vpc: ec2.IVpc
    _internetAccess: boolean

    constructor(scope: Construct, id: string, props: EksProps) {
        super(scope, `${id}-eks`)
        this.id = id
        this._vpc = props.vpc
        this._internetAccess = props.internetAccess
        this._cluster = this.createCluster()
        this.configureLoadBalancerController()
        this.tagSubnets()
    }

    private createCluster(): eks.Cluster {
        let nodeSubnetType;
        if (this._internetAccess) {
            nodeSubnetType = ec2.SubnetType.PUBLIC
        } else {
            nodeSubnetType = ec2.SubnetType.PRIVATE_WITH_NAT
        }

        const cluster = new eks.Cluster(this, `${this.id}-eks-cluster`, {
            version: eks.KubernetesVersion.V1_21,
            vpc: this._vpc,
            defaultCapacity: 0
        });
        cluster.addAutoScalingGroupCapacity(`${this.id}-eks-nodes`, {
            instanceType: new ec2.InstanceType('t2.medium'),
            minCapacity: 3,
            vpcSubnets: {
                subnetType: nodeSubnetType
            }
        })
        return cluster
    }

    private configureLoadBalancerController() {
        const loadBalancerServiceAccountName = 'aws-load-balancer-controller'
        const serviceAccount = this._cluster.addServiceAccount(`${this.id}-lb-sa`, {
            name: loadBalancerServiceAccountName,
            namespace: 'default'
        })
        serviceAccount.addToPrincipalPolicy(
            new iam.PolicyStatement({
                resources: ['*'],
                actions: [
                    'elasticloadbalancing:CreateListener',
                    'elasticloadbalancing:CreateTargetGroup',
                    'elasticloadbalancing:DeleteListener',
                    'elasticloadbalancing:CreateRule',
                    'elasticloadbalancing:DeleteRule',
                    'iam:CreateServiceLinkedRole',
                    'ec2:AuthorizeSecurityGroupIngress',
                    'ec2:RevokeSecurityGroupIngress',
                    'ec2:CreateSecurityGroup',
                    'cognito-idp:DescribeUserPoolClient',
                    'acm:ListCertificates',
                    'acm:DescribeCertificate',
                    'iam:ListServerCertificates',
                    'iam:GetServerCertificate',
                    'waf-regional:GetWebACL',
                    'waf-regional:GetWebACLForResource',
                    'waf-regional:AssociateWebACL',
                    'waf-regional:DisassociateWebACL',
                    'wafv2:GetWebACL',
                    'wafv2:GetWebACLForResource',
                    'wafv2:AssociateWebACL',
                    'wafv2:DisassociateWebACL',
                    'shield:GetSubscriptionState',
                    'shield:DescribeProtection',
                    'shield:CreateProtection',
                    'shield:DeleteProtection',
                    'ec2:DescribeAccountAttributes',
                    'ec2:DescribeAddresses',
                    'ec2:DescribeAvailabilityZones',
                    'ec2:DescribeInternetGateways',
                    'ec2:DescribeVpcs',
                    'ec2:DescribeVpcPeeringConnections',
                    'ec2:DescribeSubnets',
                    'ec2:DescribeSecurityGroups',
                    'ec2:DescribeInstances',
                    'ec2:DescribeNetworkInterfaces',
                    'ec2:DescribeTags',
                    'ec2:GetCoipPoolUsage',
                    'ec2:DescribeCoipPools',
                    'elasticloadbalancing:DescribeLoadBalancers',
                    'elasticloadbalancing:DescribeLoadBalancerAttributes',
                    'elasticloadbalancing:DescribeListeners',
                    'elasticloadbalancing:DescribeListenerCertificates',
                    'elasticloadbalancing:DescribeSSLPolicies',
                    'elasticloadbalancing:DescribeRules',
                    'elasticloadbalancing:DescribeTargetGroups',
                    'elasticloadbalancing:DescribeTargetGroupAttributes',
                    'elasticloadbalancing:DescribeTargetHealth',
                    'elasticloadbalancing:DescribeTags',
                    'elasticloadbalancing:SetWebAcl',
                    'elasticloadbalancing:ModifyListener',
                    'elasticloadbalancing:AddListenerCertificates',
                    'elasticloadbalancing:RemoveListenerCertificates',
                    'elasticloadbalancing:ModifyRule'
                ],
                effect: iam.Effect.ALLOW
            })
        )
        this._cluster.addHelmChart(
            `${this.id}-lb-helm`,
            {
                chart: 'aws-load-balancer-controller',
                repository: 'https://aws.github.io/eks-charts',
                namespace: 'default',
                release: `${this.id}-lb`,
                version: '1.4.3',
                values: {
                    deploymentAnnotations: {
                        'service.beta.kubernetes.io/aws-load-balancer-scheme' : "internet-facing"
                    },
                    clusterName: this._cluster.clusterName,
                    vpcId: this._vpc.vpcId,
                    serviceAccount: {
                        create: false,
                        name: loadBalancerServiceAccountName,
                    }
                }
            }
        )
    }

    private tagSubnets() {
        for (let subnet of this._vpc.privateSubnets){
            let importedSubnet = ec2.Subnet.fromSubnetId(this, `${subnet.subnetId}`, subnet.subnetId)
            cdk.Tags.of(importedSubnet).add(
                `kubernetes.io/role/internal-elb`,
                '1'
            )
        }
        
    }

}