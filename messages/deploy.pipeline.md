# summary

Deploy changes from a branch to the pipeline stage’s org.

# description

Before you run this command, changes in the branch must be merged in the source control repository.

# examples

- Deploy changes in the Staging branch to the Staging environment (sandbox), if the previous stage is the bundling stage:

  <%= config.bin %> <%= command.id %> --devops-center-project-name “Recruiting App” --branch-name staging --devops-center-username MyStagingSandbox --bundle-version-name 1.0

- Deploy all changes in the main branch to the release environment:

  <%= config.bin %> <%= command.id %> --devops-center-project-name “Recruiting App” --branch-name main --devops-center-username MyReleaseOrg --deploy-all

# error.ClientTimeout

The command has timed out, although the deployment is still running. To check the status of the deploy operation, run "sf deploy pipeline report".
