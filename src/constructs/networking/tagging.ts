
import { Construct } from 'constructs';
import { AwsCustomResource, PhysicalResourceId, AwsCustomResourcePolicy } from 'aws-cdk-lib/custom-resources';

// CDK does not support tagging existing subnets.
// This is a custom construct to use AWS SDK to tag subnets.

export interface SubnetTaggingProps {
    ec2ResourceTagsRequest: {
        Resources: string[];
        Tags: {
            Key: string;
            Value: string;
        }[];
    };
}

export class SubnetTagging extends Construct {
    constructor(scope: Construct, id: string, props: SubnetTaggingProps) {
        super(scope, id);

        const {
            ec2ResourceTagsRequest
        } = props

        const sdkCall = { // will also be called for a CREATE event
            service: 'EC2',
            action: 'createTags',
            parameters: ec2ResourceTagsRequest,
            physicalResourceId: PhysicalResourceId.of(id)
        }
        const resourcePolicy = AwsCustomResourcePolicy.fromSdkCalls({
            resources: AwsCustomResourcePolicy.ANY_RESOURCE,
        })

        new AwsCustomResource(this, 'tagResources', {
            onUpdate: sdkCall,
            onCreate: sdkCall,
            policy: resourcePolicy
        },
        );
    }
}