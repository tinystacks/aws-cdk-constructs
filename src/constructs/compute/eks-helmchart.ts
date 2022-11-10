import * as eks from 'aws-cdk-lib/aws-eks';
import { Construct } from 'constructs';
import { constructId } from '@tinystacks/iac-utils';

export interface EksHelmChartProps {
  eksCluster: eks.ICluster;
  chartName: string;
  repository: string;
  namespace?: string;
  createNamespace?: boolean;
  release?: string;
  version?: string;
  values?: { [key: string]: any; }
}

export class EksHelmChart extends Construct {

  constructor (scope: Construct, id: string, props: EksHelmChartProps) {
    super (scope, id);

    props.eksCluster.addHelmChart(
      constructId('eks', 'helm'),
      {
        chart: props.chartName,
        repository: props.repository,
        namespace: props.namespace,
        createNamespace: props.createNamespace,
        release: props.release,
        version: props.version,
        values: props.values
      }
    );
  
  }
}