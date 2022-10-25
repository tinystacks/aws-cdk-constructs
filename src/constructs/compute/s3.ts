import { Construct } from 'constructs'
import * as s3Deployment from 'aws-cdk-lib/aws-s3-deployment'
import * as s3 from 'aws-cdk-lib/aws-s3'
import { BucketProps } from 'aws-cdk-lib/aws-s3'

interface S3Props {
  bucketProps?: BucketProps
  existingBucketArn?: string
}

export class S3 extends Construct {
  private readonly bucket: s3.IBucket
  private readonly id: string
  private readonly bucketProps: BucketProps | undefined

  constructor (scope: Construct, id: string, props: S3Props) {
    super(scope, id)

    const {
      existingBucketArn,
      bucketProps
    } = props
    this.id = id
    this.bucketProps = bucketProps

    if (existingBucketArn !== undefined) {
      this.bucket = s3.Bucket.fromBucketArn(this, `${id}-bucket`, existingBucketArn)
    } else {
      this.bucket = this.createBucket()
    }
  }

  private createBucket () {
    return new s3.Bucket(this, `${this.id}-bucket`, this.bucketProps)
  }

  public uploadSource (source: [s3Deployment.ISource], bucketKeyPrefix: string) {
    new s3Deployment.BucketDeployment(this, `${this.id}-fileUpload`, {
      sources: source,
      prune: false,
      destinationBucket: this.bucket,
      destinationKeyPrefix: bucketKeyPrefix
    })
  }

  public get bucketArn (): string {
    return this.bucket.bucketArn
  }

  public get bucketName (): string {
    return this.bucket.bucketName
  }
}
