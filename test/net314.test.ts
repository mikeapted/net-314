import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import cdk = require('@aws-cdk/core');
import Temp = require('../lib/net314-stack');

test('Empty Stack', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new Temp.Net314Stack(app, 'MyTestStack');
  // THEN
  expectCDK(stack).to(matchTemplate({
    "Resources": {}
  }, MatchStyle.EXACT))
});