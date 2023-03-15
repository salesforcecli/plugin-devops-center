# promote.branch-name.summary

Name of the branch in the source control repository from which to deploy changes to the stage’s org.

# promote.deploy-all.summary

Deploy all metadata in branch.

# promote.deploy-all.description

If you don’t specify this flag, only changes in the stage’s branch are deployed.

# promote.bundle-version-name.summary

Version name of the bundle.

# promote.bundle-version-name.description

You must indicate the bundle version if deploying to the environment that corresponds to the first stage after the bundling stage.

# promote.tests.summary

Apex tests to run when --test-level is RunSpecifiedTests.

# promote.tests.description

Separate multiple test names with commas, and enclose the entire flag value in double quotes if a test name contains a space.

# promote.test-level.summary

Deployment Apex testing level.

# promote.test-level.description

Valid values are:

- NoTestRun — No tests are run. This test level applies only to deployments to development environments, such as sandbox, Developer Edition, or trial orgs. This test level is the default for development environments.

- RunSpecifiedTests — Runs only the tests that you specify with the --run-tests flag. Code coverage requirements differ from the default coverage requirements when using this test level. Executed tests must comprise a minimum of 75% code coverage for each class and trigger in the deployment package. This coverage is computed for each class and trigger individually and is different than the overall coverage percentage.

- RunLocalTests — All tests in your org are run, except the ones that originate from installed managed and unlocked packages. This test level is the default for production deployments that include Apex classes or triggers.

- RunAllTestsInOrg — All tests in your org are run, including tests of managed packages.

If you don’t specify a test level, the default behavior depends on the contents of your deployment package. For more information, see [Running Tests in a Deployment](https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_deploy_running_tests.htm) in the "Metadata API Developer Guide".

# promote.async.description

The command immediately returns the job ID and control of the terminal to you. This way, you can continue to use the CLI. To resume the deployment, run "sf deploy pipeline resume". To check the status of the deployment, run "sf deploy pipeline report".

# promote.async.summary

Run the command asynchronously.
