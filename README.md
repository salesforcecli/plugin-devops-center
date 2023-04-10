**NOTE: This command is currently in beta. Any aspect of this command can change without advanced notice. Don't use beta commands in your scripts.**

# plugin-devops-center

<!--[![NPM](https://img.shields.io/npm/v/@salesforce/plugin-template-sf.svg?label=@salesforce/plugin-template-sf)](https://www.npmjs.com/package/@salesforce/plugin-template-sf) [![Downloads/week](https://img.shields.io/npm/dw/@salesforce/plugin-template-sf.svg)](https://npmjs.org/package/@salesforce/plugin-template-sf) [![License](https://img.shields.io/badge/License-BSD%203--Clause-brightgreen.svg)](https://raw.githubusercontent.com/salesforcecli/plugin-template-sf/main/LICENSE.txt) -->

## Contributing

1. Please read our [Code of Conduct](CODE_OF_CONDUCT.md)
2. Create a new issue before starting your project so that we can keep track of
   what you are trying to add/fix. That way, we can also offer suggestions or
   let you know if there is already an effort in progress.
3. Fork this repository.
4. [Build the plugin locally](#build)
5. Create a _topic_ branch in your fork. Note, this step is recommended but technically not required if contributing using a fork.
6. Edit the code in your fork.
7. Write appropriate tests for your changes. Try to achieve at least 95% code coverage on any new code. No pull request will be accepted without unit tests.
8. Sign CLA (see [CLA](#cla) below).
9. Send us a pull request when you are done. We'll review your code, suggest any needed changes, and merge it in.

### CLA

External contributors will be required to sign a Contributor's License
Agreement. You can do so by going to https://cla.salesforce.com/sign-cla.

### Build

To build the plugin locally, make sure to have yarn installed and run the following commands:

```bash
# Clone the repository
git clone git@github.com:salesforcecli/plugin-devops-center

# Install the dependencies and compile
yarn && yarn build
```

To use your plugin, run using the local `./bin/dev` or `./bin/dev.cmd` file.

```bash
# Run using local run file.
./bin/dev project deploy pipeline start
```

There should be no differences when running via the Salesforce CLI or using the local run file. However, it can be useful to link the plugin to do some additional testing or run your commands from anywhere on your machine.

```bash
# Link your plugin to the sf cli
sf plugins link .

# To verify
sf plugins
```

## Commands

<!-- commands -->

- [`sf project deploy pipeline start`](#sf-project-deploy-pipeline-start)
- [`sf project deploy pipeline report`](#sf-project-deploy-pipeline-report)
- [`sf project deploy pipeline resume`](#sf-project-deploy-pipeline-resume)

## `sf project deploy pipeline start`

Deploy changes from a branch to the pipeline stage’s org.

```
USAGE
$ sf project deploy pipeline start [--json] [-c <value>] [-p <value>] [-b <value>] [-v <value>] [-a] [--async | -w <value>] [--concise | --verbose]
    [-t <value>] [-l NoTestRun|RunSpecifiedTests|RunLocalTests|RunAllTestsInOrg]

FLAGS
  -a, --deploy-all                                Deploy all metadata in the branch.
  -b, --branch-name=<value>                       Name of the branch in the source control repository from which to deploy changes to the stage’s org.
  -c, --devops-center-username=<value>            Username or alias for the DevOps Center org.
  -l, --test-level=<option>                       [default: NoTestRun] Deployment Apex testing level.
                                                  <options: NoTestRun|RunSpecifiedTests|RunLocalTests|RunAllTestsInOrg>
  -p, --devops-center-project-name=<value>        Name of the DevOps Center project.
  -t, --tests=<value>...                          Apex tests to run when --test-level is RunSpecifiedTests.
  -v, --bundle-version-name=<value>               Version name of the bundle.
  -w, --wait=<minutes>                            Number of minutes to wait for command to complete and display results.
  --async                                         Run the command asynchronously.
  --concise                                       Show concise output of the deploy result.
  --verbose                                       Show verbose output of the deploy result.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
Before you run this command, changes in the branch must be merged in the source control repository.

EXAMPLES
Deploy changes in the Staging branch to the Staging environment (sandbox), if the previous stage is the bundling stage:

  $ sf project deploy pipeline start —-devops-center-project-name “Recruiting App” —-branch-name staging —-devops-center-username MyStagingSandbox —-bundle-version-name 1.0

Deploy all changes in the main branch to the release environment:

  $ sf project deploy pipeline start —-devops-center-project-name “Recruiting App” —-branch-name main —-devops-center-username MyReleaseOrg —-deploy-all

FLAG DESCRIPTIONS
-a, --deploy-all  Deploy all metadata in the branch

  If you don’t specify this flag, only changes in the stage’s branch are deployed.

-b, --branch-name=<value> Name of the branch in the source control repository from which to deploy changes to the stage’s org.

-c, --devops-center-username=<value> Username or alias for the DevOps Center org.

-l, --test-level=NoTestRun|RunSpecifiedTests|RunLocalTests|RunAllTestsInOrg  Deployment Apex testing level.

    Valid values are:

    - NoTestRun — No tests are run. This test level applies only to deployments to development environments, such as
    sandbox, Developer Edition, or trial orgs. This test level is the default for development environments.

    - RunSpecifiedTests — Runs only the tests that you specify with the --run-tests flag. Code coverage requirements
    differ from the default coverage requirements when using this test level. Executed tests must comprise a minimum of
    75% code coverage for each class and trigger in the deployment package. This coverage is computed for each class and
    trigger individually and is different than the overall coverage percentage.

    - RunLocalTests — All tests in your org are run, except the ones that originate from installed managed and unlocked
    packages. This test level is the default for production deployments that include Apex classes or triggers.

    - RunAllTestsInOrg — All tests in your org are run, including tests of managed packages.

    If you don’t specify a test level, the default behavior depends on the contents of your deployment package. For more
    information, see [Running Tests in a
    Deployment](https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_deploy_running_tests.htm)
    in the "Metadata API Developer Guide".

-p, --devops-center-project-name=<value> Name of the DevOps Center project.

-t, --tests=<value>... Apex tests to run when --test-level is RunSpecifiedTests.

  Separate multiple test names with commas, and enclose the entire flag value in double quotes if a test contains a space.

-v, --bundle-version-name=<value> Version name of the bundle

  You must indicate the bundle version if deploying to the environment that corresponds to the first stage after the bundling stage.

-w, --wait=<minutes> Number of minutes to wait for command to complete and display results.

  If the command continues to run after the wait period, the CLI returns control of the terminal window to you and returns the job ID.
  To check the status of the deploy operation, run "sf project deploy pipeline report".

--async  Run the command asynchronously.

  The command immediately returns the job ID and control of the terminal to you. This way, you can continue to use the CLI. To resume the deployment,
  run "sf project deploy pipeline resume". To check the status of the deployment, run "sf project deploy pipeline report".
```

## `sf project deploy pipeline report`

Check the status of a pipeline deploy operation.

```
USAGE
  $ sf project deploy pipeline report [--json] [-c <value>] [-i <value>] [-r]

FLAGS
  -c, --devops-center-username=<value>  Username or alias for the DevOps Center org.
  -i, --job-id=<value>                  Job ID of the pipeline deployment you want to check the status of.
  -r, --use-most-recent                 Use the job ID of the most recent deploy operation.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Check the status of a pipeline deploy operation.

  Run this command by either passing it a job ID or specifying the —use-most-recent flag to use the job ID of the most recent deploy operation.

EXAMPLES
  Check the status using a job ID:

    $ sf project deploy pipeline report --devops-center-username MyStagingSandbox --job-id 0Af0x000017yLUFCA2

  Check the status of the most recent deploy operation:

    $ sf project deploy pipeline report --devops-center-username MyStagingSandbox --use-most-recent

FLAG DESCRIPTIONS
  -c, --devops-center-username=<value> Username or alias for the DevOps Center org.

  -i, --job-id=<value>  Job ID of the pipeline deployment you want to check the status of.

      The job ID is valid for 10 days from when you started the deploy operation.

  -r, --use-most-recent  Use the job ID of the most recent deploy operation.

      For performance reasons, this flag uses job IDs for deploy operations that started in the past 3 days or fewer. If your most recent operation was longer than 3 days ago, this flag won't find a job ID.

```

## `sf project deploy pipeline resume`

Resume watching a pipeline deploy operation.

```
  USAGE
    $ sf project deploy pipeline resume [--json] [-c <value>] [-i <value>] [-r] [-w <value>] [--concise | --verbose]

  FLAGS
    -c, --devops-center-username=<value>  Username or alias of the DevOps Center org.
    -i, --job-id=<value>                  Job ID of the pipeline deploy operation you want to resume.
    -r, --use-most-recent                 Use the job ID of the most recent deploy operation.
    -w, --wait=<minutes>                  Number of minutes to wait for command to complete and display results.
    --concise                             Show concise output of the deploy result.
    --verbose                             Show verbose output of the deploy result.

  GLOBAL FLAGS
    --json  Format output as json.

  DESCRIPTION
    Resume watching a pipeline deploy operation.

    Use this command to resume watching a pipeline deploy operation if the original command times out or you specified the --async flag.
    Run this command by either passing it a job ID or specifying the --use-most-recent flag to use the job ID of the most recent deploy operation.

  EXAMPLES
    Resume watching a deploy operation using a job ID:

      $ sf project deploy pipeline resume --job-id 0Af0x000017yLUFCA2

    Resume watching the most recent deploy operation:

      $ sf project deploy pipeline resume --use-most-recent

  FLAG DESCRIPTIONS
    -i, --job-id=<value>  Job ID of the pipeline deploy operation you want to resume.

      These commands return a job ID if they time out or you specified the --async flag:

      - sf project deploy pipeline start
      - sf project deploy pipeline validate
      - sf project deploy pipeline quick

      The job ID is valid for 10 days from when you started the deploy operation.

    -r, --use-most-recent  Use the job ID of the most recent deploy operation.

      For performance reasons, this flag uses job IDs for operations that started in the past 3 days or fewer. If your most recent operation was longer than 3 days ago, this flag won't find a job ID.

    -w, --wait=<minutes>  Number of minutes to wait for command to complete and display results.

      If the command continues to run after the wait period, the CLI returns control of the terminal window to you and returns the job ID. To check the status of the operation, run "sf project deploy pipeline report".
```
