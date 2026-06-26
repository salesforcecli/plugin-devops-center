# summary

Create a pull request for a work item branch.

# description

The pull request title defaults to the work item subject. The work item must have an associated branch and repository. Requires VCS authentication: set GITHUB_TOKEN (or use `gh auth login`) for GitHub, or set BITBUCKET_TOKEN for Bitbucket.

# flags.work-item-name.summary

Name of the work item, such as WI-000001.

# flags.work-item-id.summary

ID of the work item.

# flags.title.summary

Title of the pull request.

# flags.body.summary

Description of the pull request.

# examples

- Create a pull request for a work item using the default title.

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --work-item-name WI-000001

- Create a pull request with a custom title and description.

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --work-item-id 0Wx000000000001 --title "Fix: Login timeout" --body "Resolves the 30s timeout on the login page"

# error.NoBranch

Work item %s doesn't have an associated branch. Mark the work item as In Progress to create a branch, then try again.

# error.NoRepo

Work item %s doesn't have an associated repository. Verify the project is connected to a source control repository and try again.

# error.NoTargetBranch

Unable to determine the target branch for work item %s. Verify the pipeline stages are configured correctly.

# error.NoProvider

Unable to determine the VCS provider for work item %s. Verify the project is connected to a supported source control provider (GitHub or Bitbucket).

# flags.target-org.summary

Username or alias of the DevOps Center org.

# error.NoToken

No authentication token found for %s. For GitHub, set the GITHUB_TOKEN environment variable or run "gh auth login". For Bitbucket, set the BITBUCKET_TOKEN environment variable.
