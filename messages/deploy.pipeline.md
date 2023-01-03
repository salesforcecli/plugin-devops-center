# summary

Deploy changes from a branch to the pipeline stage’s org.

# description

Before you run this command, changes in the branch must be merged in the source control repository.

# examples

- Deploy changes in the Staging branch to the Staging environment (sandbox), if the previous stage is the bundling stage:

  <%= config.bin %> <%= command.id %> --devops-center-project-name “Recruiting App” --branch-name staging --devops-center-username MyStagingSandbox --bundle-version-name 1.0

- Deploy all changes in the main branch to the release environment:

  <%= config.bin %> <%= command.id %> --devops-center-project-name “Recruiting App” --branch-name main --devops-center-username MyReleaseOrg --deploy-all

# error.BranchNotFound

Can't find any branch named %s in project %s.

# error.NoTestsSpecified

You must specify tests using the --tests flag if the --test-level flag is set to RunSpecifiedTests.

# error.InvalidRunTests

runTests can only be used with a testLevel of RunSpecifiedTests.
