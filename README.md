**NOTE: This command is currently in beta. Any aspect of this command can change without advanced notice. Don't use beta commands in your scripts.**

# plugin-devops-center

<!--[![NPM](https://img.shields.io/npm/v/@salesforce/plugin-template-sf.svg?label=@salesforce/plugin-template-sf)](https://www.npmjs.com/package/@salesforce/plugin-template-sf) [![Downloads/week](https://img.shields.io/npm/dw/@salesforce/plugin-template-sf.svg)](https://npmjs.org/package/@salesforce/plugin-template-sf) [![License](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](https://opensource.org/license/apache-2-0) -->

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

- [`sf devops pipeline activate`](#sf-devops-pipeline-activate)
- [`sf devops pipeline attach-project`](#sf-devops-pipeline-attach-project)
- [`sf devops pipeline create`](#sf-devops-pipeline-create)
- [`sf devops pipeline stage add`](#sf-devops-pipeline-stage-add)
- [`sf devops project create`](#sf-devops-project-create)
- [`sf devops project list`](#sf-devops-project-list)
- [`sf devops pull-request create`](#sf-devops-pull-request-create)
- [`sf devops work-item create`](#sf-devops-work-item-create)
- [`sf devops work-item list`](#sf-devops-work-item-list)
- [`sf devops work-item status update`](#sf-devops-work-item-status-update)
- [`sf project deploy pipeline quick`](#sf-project-deploy-pipeline-quick)
- [`sf project deploy pipeline report`](#sf-project-deploy-pipeline-report)
- [`sf project deploy pipeline resume`](#sf-project-deploy-pipeline-resume)
- [`sf project deploy pipeline start`](#sf-project-deploy-pipeline-start)
- [`sf project deploy pipeline validate`](#sf-project-deploy-pipeline-validate)

## `sf devops pipeline activate`

Activate a DevOps Center pipeline for deployments.

```
USAGE
  $ sf devops pipeline activate -o <value> --pipeline-id <value> [--json] [--flags-dir <value>] [--api-version <value>]

FLAGS
  -o, --target-org=<value>   (required) Username or alias of the target org. Not required if the `target-org`
                             configuration variable is already set.
      --api-version=<value>  Override the api version used for api requests made by this command
      --pipeline-id=<value>  (required) ID of the pipeline.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Activate a DevOps Center pipeline for deployments.

  A pipeline must have at least one stage before you activate it. You can't modify the pipeline stages after you
  activate and promote changes through it.

EXAMPLES
  Activate a pipeline using the pipeline ID.

    $ sf devops pipeline activate --target-org my-devops-org --pipeline-id 0XB000000000001
```

_See code: [src/commands/devops/pipeline/activate.ts](https://github.com/salesforcecli/plugin-devops-center/blob/1.2.28/src/commands/devops/pipeline/activate.ts)_

## `sf devops pipeline attach-project`

Attach a DevOps Center project to a pipeline.

```
USAGE
  $ sf devops pipeline attach-project -o <value> --pipeline-id <value> --project-id <value> [--json] [--flags-dir <value>]
    [--api-version <value>]

FLAGS
  -o, --target-org=<value>   (required) Username or alias of the target org. Not required if the `target-org`
                             configuration variable is already set.
      --api-version=<value>  Override the api version used for api requests made by this command
      --pipeline-id=<value>  (required) ID of the pipeline.
      --project-id=<value>   (required) ID of the DevOps Center project.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Attach a DevOps Center project to a pipeline.

  You can attach a project to only one pipeline.

EXAMPLES
  Attach a project to a pipeline using the project ID and pipeline ID.

    $ sf devops pipeline attach-project --target-org my-devops-org --pipeline-id 0XB000000000001 --project-id \
      0Hn000000000001
```

_See code: [src/commands/devops/pipeline/attach-project.ts](https://github.com/salesforcecli/plugin-devops-center/blob/1.2.28/src/commands/devops/pipeline/attach-project.ts)_

## `sf devops pipeline create`

Create a DevOps Center pipeline.

```
USAGE
  $ sf devops pipeline create -o <value> -n <value> -r <value> [--json] [--flags-dir <value>] [--api-version <value>]
    [--repo-type github|bitbucket] [--create-repo] [--repo-owner <value>] [--bitbucket-project <value>] [-d <value>]

FLAGS
  -d, --description=<value>        Description of the pipeline.
  -n, --name=<value>               (required) Name of the pipeline.
  -o, --target-org=<value>         (required) Username or alias of the target org. Not required if the `target-org`
                                   configuration variable is already set.
  -r, --repo=<value>               (required) URL of an existing repository or the name of a repository to create.
      --api-version=<value>        Override the api version used for api requests made by this command
      --bitbucket-project=<value>  Bitbucket project key for the repository. Used when creating a Bitbucket repository
                                   with '--create-repo'.
      --create-repo                Create a repository if it doesn't exist.
      --repo-owner=<value>         Owner (organization or user) of the repository. Required when creating a repository
                                   using '--create-repo'.
      --repo-type=<option>         Type of the source code repository. Required when creating a repository using
                                   '--create-repo'.
                                   <options: github|bitbucket>

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Create a DevOps Center pipeline.

  Provide the URL of an existing repository, or use `--create-repo` with a repository name to create one. After you
  create the pipeline, add stages, and activate the pipeline.

EXAMPLES
  Create a pipeline and associate it with an existing GitHub repository.

    $ sf devops pipeline create --target-org my-devops-org --name "Release Pipeline" --repo \
      https://github.com/myorg/myrepo

  Create a pipeline and associate it with a new GitHub repository.

    $ sf devops pipeline create --target-org my-devops-org --name "Release Pipeline" --repo my-new-repo --repo-type \
      github --repo-owner myorg --create-repo

  Create a pipeline with a description and associate it with a Bitbucket repository.

    $ sf devops pipeline create --target-org my-devops-org --name "Release Pipeline" --repo \
      https://bitbucket.org/myorg/myrepo --description "Main CI/CD pipeline for production releases"
```

_See code: [src/commands/devops/pipeline/create.ts](https://github.com/salesforcecli/plugin-devops-center/blob/1.2.28/src/commands/devops/pipeline/create.ts)_

## `sf devops pipeline stage add`

Add a stage to a DevOps Center pipeline.

```
USAGE
  $ sf devops pipeline stage add -o <value> --pipeline-id <value> -n <value> --next-stage-id <value> [--json] [--flags-dir
    <value>] [--api-version <value>]

FLAGS
  -n, --name=<value>           (required) Name of the pipeline stage, such as Integration, UAT, or Staging.
  -o, --target-org=<value>     (required) Username or alias of the target org. Not required if the `target-org`
                               configuration variable is already set.
      --api-version=<value>    Override the api version used for api requests made by this command
      --next-stage-id=<value>  (required) ID of the stage that follows the new stage in the pipeline.
      --pipeline-id=<value>    (required) ID of the pipeline where the stage is added.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Add a stage to a DevOps Center pipeline.

  Inserts an empty stage before the stage specified by `--next-stage-id`. The new stage doesn't include a branch or
  environment. Configure them separately after you create the stage.

EXAMPLES
  Add a Development stage before Integration in a specific pipeline.

    $ sf devops pipeline stage add --target-org my-devops-org --pipeline-id 0XB000000000001 --name "Development" \
      --next-stage-id 0Xc000000000002

  Add a QA stage before UAT in a specific pipeline.

    $ sf devops pipeline stage add --target-org my-devops-org --pipeline-id 0XB000000000001 --name "QA" \
      --next-stage-id 0Xc000000000003
```

_See code: [src/commands/devops/pipeline/stage/add.ts](https://github.com/salesforcecli/plugin-devops-center/blob/1.2.28/src/commands/devops/pipeline/stage/add.ts)_

## `sf devops project create`

Create a DevOps Center project in a DevOps Center org.

```
USAGE
  $ sf devops project create -o <value> -n <value> [--json] [--flags-dir <value>] [--api-version <value>] [-d <value>]

FLAGS
  -d, --description=<value>  Description of the new project; if not specified, the description is blank.
  -n, --name=<value>         (required) Name of the new DevOps Center project.
  -o, --target-org=<value>   (required) Username or alias of the target org. Not required if the `target-org`
                             configuration variable is already set.
      --api-version=<value>  Override the api version used for api requests made by this command

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Create a DevOps Center project in a DevOps Center org.

  Creates a new DevOps Center project with the specified name and optional description.

EXAMPLES
  Create a new DevOps Center project in the specified org.

    $ sf devops project create --target-org my-devops-org --name "MyApp Release"

  Create a project with a name and description.

    $ sf devops project create --target-org my-devops-org --name "Platform Update" --description "Platform services \
      update"
```

_See code: [src/commands/devops/project/create.ts](https://github.com/salesforcecli/plugin-devops-center/blob/1.2.28/src/commands/devops/project/create.ts)_

## `sf devops project list`

List all DevOps Center projects in a Salesforce org.

```
USAGE
  $ sf devops project list -o <value> [--json] [--flags-dir <value>] [--api-version <value>]

FLAGS
  -o, --target-org=<value>   (required) Username or alias of the target org. Not required if the `target-org`
                             configuration variable is already set.
      --api-version=<value>  Override the api version used for api requests made by this command

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  List all DevOps Center projects in a Salesforce org.

  This command queries the DevopsProject standard object and returns the project Id, Name, and Description for each
  project found.

EXAMPLES
  List all DevOps Center projects in an org with alias "my-devops-org":

    $ sf devops project list --target-org my-devops-org

  List projects using an org's username:

    $ sf devops project list --target-org devops-center@example.com
```

_See code: [src/commands/devops/project/list.ts](https://github.com/salesforcecli/plugin-devops-center/blob/1.2.28/src/commands/devops/project/list.ts)_

## `sf devops pull-request create`

Create a pull request for a work item branch.

```
USAGE
  $ sf devops pull-request create -o <value> [--json] [--flags-dir <value>] [--api-version <value>] [-n <value>] [-w <value>]
    [--title <value>] [--body <value>]

FLAGS
  -n, --work-item-name=<value>  Name of the work item, such as WI-000001.
  -o, --target-org=<value>      (required) Username or alias of the target org. Not required if the `target-org`
                                configuration variable is already set.
  -w, --work-item-id=<value>    ID of the work item.
      --api-version=<value>     Override the api version used for api requests made by this command
      --body=<value>            Description of the pull request.
      --title=<value>           Title of the pull request.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Create a pull request for a work item branch.

  The pull request title defaults to the work item subject. The work item must have an associated branch and repository.
  Requires VCS authentication: set GITHUB_TOKEN (or use `gh auth login`) for GitHub, or set BITBUCKET_TOKEN for
  Bitbucket.

EXAMPLES
  Create a pull request for a work item using the default title.

    $ sf devops pull-request create --target-org my-devops-org --work-item-name WI-000001

  Create a pull request with a custom title and description.

    $ sf devops pull-request create --target-org my-devops-org --work-item-id 0Wx000000000001 --title "Fix: Login \
      timeout" --body "Resolves the 30s timeout on the login page"
```

_See code: [src/commands/devops/pull-request/create.ts](https://github.com/salesforcecli/plugin-devops-center/blob/1.2.28/src/commands/devops/pull-request/create.ts)_

## `sf devops work-item create`

Create a new work item in a DevOps Center project.

```
USAGE
  $ sf devops work-item create -o <value> -p <value> -s <value> [--json] [--flags-dir <value>] [--api-version <value>] [-d
    <value>]

FLAGS
  -d, --description=<value>  Description of the new work item; if not specified, the description is blank.
  -o, --target-org=<value>   (required) Username or alias of the target org. Not required if the `target-org`
                             configuration variable is already set.
  -p, --project-id=<value>   (required) ID of the DevOps Center project to create the work item in.
  -s, --subject=<value>      (required) Subject (title) of the new work item.
      --api-version=<value>  Override the api version used for api requests made by this command

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Create a new work item in a DevOps Center project.

  The command creates the work item using the Connect API. Requires a project ID and a subject for the new work item;
  run the `devops project list` command to get the IDs for all existing projects.

EXAMPLES
  Create a work item for the project with the specified ID and give the work item the specified subject (title); use
  the DevOps Center org with alias "my-devops-org":

    $ sf devops work-item create --target-org my-devops-org --project-id 1Qg000000000001 --subject "Fix login bug"

  Create a work item with a subject and description:

    $ sf devops work-item create --target-org my-devops-org --project-id 1Qg000000000001 --subject "Add dark mode" \
      --description "Implement dark mode toggle in settings page"
```

_See code: [src/commands/devops/work-item/create.ts](https://github.com/salesforcecli/plugin-devops-center/blob/1.2.28/src/commands/devops/work-item/create.ts)_

## `sf devops work-item list`

List all work items for a DevOps Center project.

```
USAGE
  $ sf devops work-item list -o <value> -p <value> [--json] [--flags-dir <value>] [--api-version <value>]

FLAGS
  -o, --target-org=<value>   (required) Username or alias of the target org. Not required if the `target-org`
                             configuration variable is already set.
  -p, --project-id=<value>   (required) ID of the DevOps Center project to list work items for.
      --api-version=<value>  Override the api version used for api requests made by this command

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  List all work items for a DevOps Center project.

  Each work item displays the branch, environment, and repository details needed for checkout and promotion. Requires a
  project ID; run the `devops project list` command to get the IDs for all existing projects.

EXAMPLES
  List work items for a specific project in the DevOps org with alias "my-devops-org":

    $ sf devops work-item list --target-org my-devops-org --project-id 1Qg000000000001

  List work items using JSON output:

    $ sf devops work-item list --target-org my-devops-org --project-id 1Qg000000000001 --json
```

_See code: [src/commands/devops/work-item/list.ts](https://github.com/salesforcecli/plugin-devops-center/blob/1.2.28/src/commands/devops/work-item/list.ts)_

## `sf devops work-item status update`

Update the status of a work item in DevOps Center.

```
USAGE
  $ sf devops work-item status update -o <value> --status In Progress|Ready to Promote [--json] [--flags-dir <value>] [--api-version
    <value>] [-n <value>] [-w <value>]

FLAGS
  -n, --work-item-name=<value>  Name of the work item, such as WI-000001.
  -o, --target-org=<value>      (required) Username or alias of the target org. Not required if the `target-org`
                                configuration variable is already set.
  -w, --work-item-id=<value>    ID of the work item.
      --api-version=<value>     Override the api version used for api requests made by this command
      --status=<option>         (required) Status to set for the work item. Allowed values: "In Progress", "Ready to
                                Promote".
                                <options: In Progress|Ready to Promote>

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Update the status of a work item in DevOps Center.

  Allowed statuses are "In Progress" and "Ready to Promote".

EXAMPLES
  Update a work item status by its name to indicate the work is underway:

    $ sf devops work-item status update --target-org my-devops-org --work-item-name WI-000001 --status "In Progress"

  Update a work item status by its ID to indicate the changes are ready for promotion:

    $ sf devops work-item status update --target-org my-devops-org --work-item-id 0Wx000000000001 --status "Ready to \
      Promote"
```

_See code: [src/commands/devops/work-item/status/update.ts](https://github.com/salesforcecli/plugin-devops-center/blob/1.2.28/src/commands/devops/work-item/status/update.ts)_

## `sf project deploy pipeline quick`

Quickly deploy a validated deployment to an org.

```
USAGE
  $ sf project deploy pipeline quick -c <value> [--json] [--flags-dir <value>] [--concise | --verbose] [-w <minutes> | --async] [-i
    <value>] [-r]

FLAGS
  -c, --devops-center-username=<value>  (required) Username or alias of the DevOps Center org.
  -i, --job-id=<value>                  Job ID of the validated deployment to quick deploy.
  -r, --use-most-recent                 Use the job ID of the most recently validated deployment.
  -w, --wait=<minutes>                  [default: 33 minutes] Number of minutes to wait for command to complete and
                                        display results.
      --async                           Run the command asynchronously.
      --concise                         Show concise output of the command result.
      --verbose                         Show verbose output of the command result.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Quickly deploy a validated deployment to an org.

  The first time you run any "project deploy pipeline" command, be sure to authorize the org in which DevOps Center is
  installed. The easiest way to authorize an org is with the "org login web" command.

  Before you run this command, create a validated deployment with the "project deploy pipeline validate" command, which
  returns a job ID. Validated deployments haven't been deployed to the org yet; you deploy them with this command.
  Either pass the job ID to this command or use the --use-most-recent flag to use the job ID of the most recently
  validated deployment. For the quick deploy to succeed, the associated validated deployment must also have succeeded.

  Executing this quick deploy command takes less time than a standard deploy because it skips running Apex tests. These
  tests were previously run as part of the validation. Validating first and then running a quick deploy is useful if the
  deployment to your production org take several hours and you don’t want to risk a failed deploy.

  This command doesn't support source-tracking. The source you deploy overwrites the corresponding metadata in your org.
  This command doesn’t attempt to merge your source with the versions in your org.

EXAMPLES
  Run a quick deploy using your default Devops Center org and a job ID:

    $ sf project deploy pipeline quick --job-id 0Af0x000017yLUFCA2

  Asynchronously run a quick deploy of the most recently validated deployment using an org with alias "my-prod-org":

    $ sf project deploy pipeline quick --async --use-most-recent --devops-center-username my-prod-org

FLAG DESCRIPTIONS
  -i, --job-id=<value>  Job ID of the validated deployment to quick deploy.

    The job ID is valid for 10 days from when you started the validation.

  -r, --use-most-recent  Use the job ID of the most recently validated deployment.

    For performance reasons, this flag uses only job IDs that were validated in the past 3 days or less. If your most
    recent deployment validation was more than 3 days ago, this flag won't find the job ID.

  -w, --wait=<minutes>  Number of minutes to wait for command to complete and display results.

    If the command continues to run after the wait period, the CLI returns control of the terminal window to you and
    returns the job ID. To check the status of the operation, run "sf project deploy pipeline report".

  --async  Run the command asynchronously.

    The command immediately returns the job ID and control of the terminal to you. This way, you can continue to use the
    CLI. To resume the deployment, run "sf project deploy pipeline resume". To check the status of the deployment, run
    "sf project deploy pipeline report".
```

_See code: [src/commands/project/deploy/pipeline/quick.ts](https://github.com/salesforcecli/plugin-devops-center/blob/1.2.28/src/commands/project/deploy/pipeline/quick.ts)_

## `sf project deploy pipeline report`

Check the status of a pipeline deploy operation.

```
USAGE
  $ sf project deploy pipeline report -c <value> [--json] [--flags-dir <value>] [-i <value>] [-r]

FLAGS
  -c, --devops-center-username=<value>  (required) Username or alias of the DevOps Center org.
  -i, --job-id=<value>                  Job ID of the pipeline deployment to check the status of.
  -r, --use-most-recent                 Use the job ID of the most recent deploy operation.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Check the status of a pipeline deploy operation.

  The first time you run any "project deploy pipeline" command, be sure to authorize the org in which DevOps Center is
  installed. The easiest way to authorize an org is with the "org login web" command.

  Run this command by either indicating a job ID or specifying the —use-most-recent flag to use the job ID of the most
  recent deploy operation.

EXAMPLES
  Check the status using a job ID:

    $ sf project deploy pipeline report --devops-center-username MyStagingSandbox --job-id 0Af0x000017yLUFCA2

  Check the status of the most recent deploy operation:

    $ sf project deploy pipeline report --devops-center-username MyStagingSandbox --use-most-recent

FLAG DESCRIPTIONS
  -i, --job-id=<value>  Job ID of the pipeline deployment to check the status of.

    The job ID is valid for 10 days from when you started the deploy operation.

  -r, --use-most-recent  Use the job ID of the most recent deploy operation.

    For performance reasons, this flag uses job IDs for deploy operations that started in the past 3 days or fewer. If
    your most recent operation was longer than 3 days ago, this flag won't find the job ID.
```

_See code: [src/commands/project/deploy/pipeline/report.ts](https://github.com/salesforcecli/plugin-devops-center/blob/1.2.28/src/commands/project/deploy/pipeline/report.ts)_

## `sf project deploy pipeline resume`

Resume watching a pipeline deploy operation.

```
USAGE
  $ sf project deploy pipeline resume -c <value> [--json] [--flags-dir <value>] [-i <value>] [-r] [--concise | --verbose] [-w
    <minutes> | ]

FLAGS
  -c, --devops-center-username=<value>  (required) Username or alias of the DevOps Center org.
  -i, --job-id=<value>                  Job ID of the pipeline deploy operation you want to resume.
  -r, --use-most-recent                 Use the job ID of the most recent deploy operation.
  -w, --wait=<minutes>                  [default: 33 minutes] Number of minutes to wait for command to complete and
                                        display results.
      --concise                         Show concise output of the command result.
      --verbose                         Show verbose output of the command result.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Resume watching a pipeline deploy operation.

  The first time you run any "project deploy pipeline" command, be sure to authorize the org in which DevOps Center is
  installed. The easiest way to authorize an org is with the "org login web" command.

  Use this command to resume watching a pipeline deploy operation if the original command times out or you specified the
  --async flag.

  Run this command by either indicating a job ID or specifying the --use-most-recent flag to use the job ID of the most
  recent deploy operation.

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

    For performance reasons, this flag uses job IDs for operations that started in the past 3 days or fewer. If your
    most recent operation was longer than 3 days ago, this flag won't find a job ID.

  -w, --wait=<minutes>  Number of minutes to wait for command to complete and display results.

    If the command continues to run after the wait period, the CLI returns control of the terminal window to you and
    returns the job ID. To check the status of the operation, run "sf project deploy pipeline report".
```

_See code: [src/commands/project/deploy/pipeline/resume.ts](https://github.com/salesforcecli/plugin-devops-center/blob/1.2.28/src/commands/project/deploy/pipeline/resume.ts)_

## `sf project deploy pipeline start`

Deploy changes from a branch to the pipeline stage’s org.

```
USAGE
  $ sf project deploy pipeline start -b <value> -p <value> -c <value> [--json] [--flags-dir <value>] [-v <value>] [-a] [-t
    <value>...] [-l NoTestRun|RunSpecifiedTests|RunLocalTests|RunAllTestsInOrg] [-w <minutes> | --async] [--concise |
    --verbose]

FLAGS
  -a, --deploy-all                          Deploy all metadata in the branch to the stage's org.
  -b, --branch-name=<value>                 (required) Name of the branch in the source control repository that
                                            corresponds to the pipeline stage that you want to deploy the changes to.
  -c, --devops-center-username=<value>      (required) Username or alias of the DevOps Center org.
  -l, --test-level=<option>                 Deployment Apex testing level.
                                            <options: NoTestRun|RunSpecifiedTests|RunLocalTests|RunAllTestsInOrg>
  -p, --devops-center-project-name=<value>  (required) Name of the DevOps Center project.
  -t, --tests=<value>...                    Apex tests to run when --test-level is RunSpecifiedTests.
  -v, --bundle-version-name=<value>         Version name of the bundle.
  -w, --wait=<minutes>                      [default: 33 minutes] Number of minutes to wait for command to complete and
                                            display results.
      --async                               Run the command asynchronously.
      --concise                             Show concise output of the command result.
      --verbose                             Show verbose output of the command result.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Deploy changes from a branch to the pipeline stage’s org.

  The first time you run any "project deploy pipeline" command, be sure to authorize the org in which DevOps Center is
  installed. The easiest way to authorize an org is with the "org login web" command.

  Before you run this command, changes in the pipeline stage's branch must be merged in the source control repository.

EXAMPLES
  Deploy changes in the Staging branch to the Staging environment (sandbox), if the previous stage is the bundling
  stage:

    $ sf project deploy pipeline start --devops-center-project-name “Recruiting App” --branch-name staging \
      --devops-center-username MyStagingSandbox --bundle-version-name 1.0

  Deploy all changes in the main branch to the release environment:

    $ sf project deploy pipeline start --devops-center-project-name “Recruiting App” --branch-name main \
      --devops-center-username MyReleaseOrg --deploy-all

FLAG DESCRIPTIONS
  -a, --deploy-all  Deploy all metadata in the branch to the stage's org.

    If you don’t specify this flag, only changes in the stage’s branch are deployed.

  -l, --test-level=NoTestRun|RunSpecifiedTests|RunLocalTests|RunAllTestsInOrg  Deployment Apex testing level.

    Valid values are:

    - NoTestRun — No tests are run. This test level applies only to deployments to development environments, such as
    sandbox, Developer Edition, or trial orgs. This test level is the default for development environments.

    - RunSpecifiedTests — Runs only the tests that you specify with the --tests flag. Code coverage requirements differ
    from the default coverage requirements when using this test level. Executed tests must comprise a minimum of 75%
    code coverage for each class and trigger in the deployment package. This coverage is computed for each class and
    trigger individually and is different than the overall coverage percentage.

    - RunLocalTests — All tests in your org are run, except the ones that originate from installed managed and unlocked
    packages. This test level is the default for production deployments that include Apex classes or triggers.

    - RunAllTestsInOrg — All tests in your org are run, including tests of managed packages.

    If you don’t specify a test level, the default behavior depends on the contents of your deployment package. For more
    information, see the section "Running Tests in a Deployment" in the "Metadata API Developer Guide".
    (https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_deploy_running_tests.htm)

  -t, --tests=<value>...  Apex tests to run when --test-level is RunSpecifiedTests.

    Separate multiple test names with commas. Enclose the entire flag value in double quotes if a test name contains
    spaces.

  -v, --bundle-version-name=<value>  Version name of the bundle.

    You must indicate the bundle version if deploying to the environment that corresponds to the first stage after the
    bundling stage.

  -w, --wait=<minutes>  Number of minutes to wait for command to complete and display results.

    If the command continues to run after the wait period, the CLI returns control of the terminal window to you and
    returns the job ID. To check the status of the operation, run "sf project deploy pipeline report".

  --async  Run the command asynchronously.

    The command immediately returns the job ID and control of the terminal to you. This way, you can continue to use the
    CLI. To resume the deployment, run "sf project deploy pipeline resume". To check the status of the deployment, run
    "sf project deploy pipeline report".
```

_See code: [src/commands/project/deploy/pipeline/start.ts](https://github.com/salesforcecli/plugin-devops-center/blob/1.2.28/src/commands/project/deploy/pipeline/start.ts)_

## `sf project deploy pipeline validate`

Perform a validate-only deployment from a branch to the pipeline stage’s org.

```
USAGE
  $ sf project deploy pipeline validate -b <value> -p <value> -c <value> [--json] [--flags-dir <value>] [-v <value>] [-a] [-t
    <value>...] [-l NoTestRun|RunSpecifiedTests|RunLocalTests|RunAllTestsInOrg] [-w <minutes> | --async] [--concise |
    --verbose]

FLAGS
  -a, --deploy-all                          Deploy all metadata in the branch to the stage's org.
  -b, --branch-name=<value>                 (required) Name of the branch in the source control repository that
                                            corresponds to the pipeline stage that you want to deploy the changes to.
  -c, --devops-center-username=<value>      (required) Username or alias of the DevOps Center org.
  -l, --test-level=<option>                 Deployment Apex testing level.
                                            <options: NoTestRun|RunSpecifiedTests|RunLocalTests|RunAllTestsInOrg>
  -p, --devops-center-project-name=<value>  (required) Name of the DevOps Center project.
  -t, --tests=<value>...                    Apex tests to run when --test-level is RunSpecifiedTests.
  -v, --bundle-version-name=<value>         Version name of the bundle.
  -w, --wait=<minutes>                      [default: 33 minutes] Number of minutes to wait for command to complete and
                                            display results.
      --async                               Run the command asynchronously.
      --concise                             Show concise output of the command result.
      --verbose                             Show verbose output of the command result.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Perform a validate-only deployment from a branch to the pipeline stage’s org.

  The first time you run any "project deploy pipeline" command, be sure to authorize the org in which DevOps Center is
  installed. The easiest way to authorize an org is with the "org login web" command.

  A validation runs Apex tests to verify whether a deployment will succeed without actually deploying the metadata to
  your environment, so you can then quickly deploy the changes later without re-running the tests.

EXAMPLES
  Perform a validate-only deployment from the Staging branch to the Staging environment (sandbox):

    $ sf project deploy pipeline validate --devops-center-project-name “Recruiting App” --branch-name staging \
      --devops-center-username MyStagingSandbox

  Perform a validate-only deployment of all changes from the main branch to the release environment:

    $ sf project deploy pipeline validate --devops-center-project-name “Recruiting App” --branch-name main \
      --devops-center-username MyReleaseOrg --deploy-all

FLAG DESCRIPTIONS
  -a, --deploy-all  Deploy all metadata in the branch to the stage's org.

    If you don’t specify this flag, only changes in the stage’s branch are deployed.

  -l, --test-level=NoTestRun|RunSpecifiedTests|RunLocalTests|RunAllTestsInOrg  Deployment Apex testing level.

    Valid values are:

    - NoTestRun — No tests are run. This test level applies only to deployments to development environments, such as
    sandbox, Developer Edition, or trial orgs. This test level is the default for development environments.

    - RunSpecifiedTests — Runs only the tests that you specify with the --tests flag. Code coverage requirements differ
    from the default coverage requirements when using this test level. Executed tests must comprise a minimum of 75%
    code coverage for each class and trigger in the deployment package. This coverage is computed for each class and
    trigger individually and is different than the overall coverage percentage.

    - RunLocalTests — All tests in your org are run, except the ones that originate from installed managed and unlocked
    packages. This test level is the default for production deployments that include Apex classes or triggers.

    - RunAllTestsInOrg — All tests in your org are run, including tests of managed packages.

    If you don’t specify a test level, the default behavior depends on the contents of your deployment package. For more
    information, see the section "Running Tests in a Deployment" in the "Metadata API Developer Guide".
    (https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_deploy_running_tests.htm)

  -t, --tests=<value>...  Apex tests to run when --test-level is RunSpecifiedTests.

    Separate multiple test names with commas. Enclose the entire flag value in double quotes if a test name contains
    spaces.

  -v, --bundle-version-name=<value>  Version name of the bundle.

    You must indicate the bundle version if deploying to the environment that corresponds to the first stage after the
    bundling stage.

  -w, --wait=<minutes>  Number of minutes to wait for command to complete and display results.

    If the command continues to run after the wait period, the CLI returns control of the terminal window to you and
    returns the job ID. To check the status of the operation, run "sf project deploy pipeline report".

  --async  Run the command asynchronously.

    The command immediately returns the job ID and control of the terminal to you. This way, you can continue to use the
    CLI. To resume the deployment, run "sf project deploy pipeline resume". To check the status of the deployment, run
    "sf project deploy pipeline report".
```

_See code: [src/commands/project/deploy/pipeline/validate.ts](https://github.com/salesforcecli/plugin-devops-center/blob/1.2.28/src/commands/project/deploy/pipeline/validate.ts)_

<!-- commandsstop -->

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
