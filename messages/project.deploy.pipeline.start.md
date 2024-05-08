# summary

Deploy changes from a branch to the pipeline stage’s org.

# description

The first time you run any "project deploy pipeline" command, be sure to authorize the org in which DevOps Center is installed. The easiest way to authorize an org is with the "sf org login web" command.

Before you run this command, changes in the pipeline stage's branch must be merged in the source control repository.

# examples

- Deploy changes in the Staging branch to the Staging environment (sandbox), if the previous stage is the bundling stage:

  <%= config.bin %> <%= command.id %> --devops-center-project-name “Recruiting App” --branch-name staging --devops-center-username MyStagingSandbox --bundle-version-name 1.0

- Deploy all changes in the main branch to the release environment:

  <%= config.bin %> <%= command.id %> --devops-center-project-name “Recruiting App” --branch-name main --devops-center-username MyReleaseOrg --deploy-all

# deployComponent.operation.column

Operation

# deployComponent.name.column

Name

# deployComponent.type.column

Type

# deployComponent.path.column

Path

# deployComponent.table.title

Deployed Source

# deployComponent.table.validateDeployTitle

Validate-only Deployed Source
