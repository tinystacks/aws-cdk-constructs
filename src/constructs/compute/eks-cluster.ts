import { Construct } from 'constructs';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';
import { constructId } from '@tinystacks/utils';
import { CfnOutput } from 'aws-cdk-lib';
import kebabCase from 'lodash.kebabcase';


export interface EksProps {
    vpc: ec2.IVpc
    internetAccess: boolean
}

export class EKS extends Construct {
  id: string;
  private readonly _cluster: eks.Cluster;
  private readonly _vpc: ec2.IVpc;
  private readonly _internetAccess: boolean;

  constructor (scope: Construct, id: string, props: EksProps) {
    super(scope, id);
    
    const {
      vpc,
      internetAccess
    } = props;
    
    this.id = id;
    this._vpc = vpc;
    this._internetAccess = internetAccess;
    this._cluster = this.createCluster();

    this.configureLoadBalancerController();
    this.tagSubnets();
  }

  private createCluster (): eks.Cluster {
    let nodeSubnetType;
    if (this.internetAccess) {
      nodeSubnetType = ec2.SubnetType.PUBLIC;
    } else {
      nodeSubnetType = ec2.SubnetType.PRIVATE_WITH_NAT;
    }

    const mastersRole = new iam.Role(this, constructId('masters', 'role'), {
      assumedBy: new iam.AccountPrincipal(cdk.Stack.of(this).account)
    });

    new CfnOutput(this, constructId('cluster', 'masters', 'role', 'name'), {
      description: `${this.id}-cluster-masters-role-name`,
      value: mastersRole.roleName
    });
    new CfnOutput(this, constructId('cluster', 'masters', 'role', 'arn'), {
      description: `${this.id}-cluster-masters-role-arn`,
      value: mastersRole.roleArn
    });

    const cluster = new eks.Cluster(this, constructId('eks', 'cluster'), {
      version: eks.KubernetesVersion.V1_21,
      vpc: this.vpc,
      defaultCapacity: 0,
      mastersRole
    });
    mastersRole.attachInlinePolicy(new iam.Policy(this, constructId('kubectl', 'policy'), {
      statements: [
        new iam.PolicyStatement({
          actions: ['kubectl:*'],
          resources: [cluster.clusterArn]
        })
      ]
    }));
    cluster.addAutoScalingGroupCapacity(constructId('eks', 'asg', 'capacity'), {
      instanceType: new ec2.InstanceType('t2.medium'),
      minCapacity: 3,
      vpcSubnets: {
        subnetType: nodeSubnetType
      }
    });

    new CfnOutput(this, constructId('cluster', 'name'), {
      description: `${this.id}-cluster-name`,
      value: cluster.clusterName
    });
    new CfnOutput(this, constructId('cluster', 'arn'), {
      description: `${this.id}-cluster-arn`,
      value: cluster.clusterArn
    });
    new CfnOutput(this, constructId('cluster', 'role', 'name'), {
      description: `${this.id}-cluster-role-name`,
      value: cluster.role.roleName
    });
    new CfnOutput(this, constructId('cluster', 'role', 'arn'), {
      description: `${this.id}-cluster-role-arn`,
      value: cluster.role.roleArn
    });
    new CfnOutput(this, constructId('cluster', 'admin', 'role', 'name'), {
      description: `${this.id}-cluster-admin-role-name`,
      value: cluster.adminRole.roleName
    });
    new CfnOutput(this, constructId('cluster', 'admin', 'role', 'arn'), {
      description: `${this.id}-cluster-admin-role-arn`,
      value: cluster.adminRole.roleArn
    });
    new CfnOutput(this, constructId('cluster', 'kubectl', 'role', 'name'), {
      description: `${this.id}-cluster-kubectl-role-name`,
      value: cluster.kubectlRole?.roleName || ''
    });
    new CfnOutput(this, constructId('cluster', 'kubectl', 'role', 'arn'), {
      description: `${this.id}-cluster-kubectl-role-arn`,
      value: cluster.kubectlRole?.roleArn || ''
    });
    return cluster;
  }

  private configureLoadBalancerController () {
    const loadBalancerServiceAccountName = 'aws-load-balancer-controller';
    const serviceAccount = this.cluster.addServiceAccount(constructId('lb', 'serviceAccount'), {
      name: loadBalancerServiceAccountName,
      namespace: 'default'
    });
    serviceAccount.addToPrincipalPolicy(
      new iam.PolicyStatement({
        resources: ['*'],
        actions: [
          'elasticloadbalancing:CreateListener',
          'elasticloadbalancing:CreateTargetGroup',
          'elasticloadbalancing:DeleteListener',
          'elasticloadbalancing:CreateLoadBalancer',
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
          'ec2:CreateTags',
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
    );

    new CfnOutput(this, constructId('eks', 'cluster', 'service', 'account', 'role', 'name'), {
      description: `${this.id}-eks-cluster-service-account-role-name`,
      value: serviceAccount.role.roleName
    });
    new CfnOutput(this, constructId('eks', 'cluster', 'service', 'account', 'role', 'arn'), {
      description: `${this.id}-eks-cluster-service-account-role-arn`,
      value: serviceAccount.role.roleArn
    });

    this.cluster.addHelmChart(
      constructId('lb', 'helm'),
      {
        chart: 'aws-load-balancer-controller',
        repository: 'https://aws.github.io/eks-charts',
        namespace: 'default',
        release: kebabCase(`${this.id}-lb`), // was throwing if it contained the TitleCase id.
        version: '1.4.3',
        values: {
          deploymentAnnotations: {
            'service.beta.kubernetes.io/aws-load-balancer-scheme': 'internet-facing'
          },
          clusterName: this.cluster.clusterName,
          vpcId: this.vpc.vpcId,
          serviceAccount: {
            create: false,
            name: loadBalancerServiceAccountName
          }
        }
      }
    );
  }

  private tagSubnets () {
    for (const subnet of this.vpc.privateSubnets) {
      const importedSubnet = ec2.Subnet.fromSubnetId(this, `${subnet.subnetId}`, subnet.subnetId);
      cdk.Tags.of(importedSubnet).add(
        'kubernetes.io/role/internal-elb',
        '1'
      );
    }
  }

  public get cluster (): eks.Cluster {
    return this._cluster;
  }
  public get vpc (): ec2.IVpc {
    return this._vpc;
  }
  public get internetAccess (): boolean {
    return this._internetAccess;
  }
}