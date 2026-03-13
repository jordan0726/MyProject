import { aws_cloudfront as cloudfront, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';

/**
 * Creates the CloudFront Function resource to use this rewrite handler.
 */
export function createRewriteHtmlFunction(scope: Construct, app: string, domain: string, stage: string): cloudfront.Function {
  return new cloudfront.Function(scope, `${app}-${domain}-${stage}-rewrite-html`, {
    functionName: `${app}-${domain}-${stage}-rewrite-html`,
    comment: 'Use for debug the deployment issue of receiptCAT frontend',
    code: cloudfront.FunctionCode.fromInline(`
      function handler(event) {
        var request = event.request;
        var uri = request.uri;

        if (uri.startsWith('/_next') || uri.startsWith('/static') || uri.includes('.')) {
          return request;
        }

        if (uri === '/') {
          request.uri = '/index.html';
          return request;
        }

        request.uri = uri + '.html';
        return request;
      }
    `),
  });
}