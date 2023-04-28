# summary

Validate-only deploy changes from a branch to the pipeline stage’s org.

# description

A validation runs Apex tests to verify whether a deployment will succeed without actually deploying the metadata to your environment, so you can then quickly deploy the changes later without re-running the tests.

# examples

- Validate-only deploy changes in the Staging branch to the Staging environment (sandbox):

  <%= config.bin %> <%= command.id %> --devops-center-project-name “Recruiting App” --branch-name staging --devops-center-username MyStagingSandbox

- Validate-only deploy all changes in the main branch to the release environment:

  <%= config.bin %> <%= command.id %> --devops-center-project-name “Recruiting App” --branch-name main --devops-center-username MyReleaseOrg --deploy-all
