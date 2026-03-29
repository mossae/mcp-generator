export const rcAppPackageTemplate = `{
  "name": "{{manifest.nameSlug}}-event-bridge",
  "version": "{{manifest.version}}",
  "scripts": {
    "build": "tsc",
    "deploy": "rc-apps deploy --url \\$RC_URL --username \\$RC_USER --password \\$RC_PASSWORD"
  },
  "devDependencies": {
    "@rocket.chat/apps-engine": "^1.41.0",
    "typescript": "^5.7.0"
  }
}
`;
