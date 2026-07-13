# summary

Create a pull request for a work item branch.

# description

Creates a pull request via the Salesforce DevOps Center API, using the VCS credentials stored in the org. Works with GitHub and Bitbucket without requiring local VCS authentication.

# flags.work-item-name.summary

Name of the work item, such as WI-000001.

# flags.work-item-id.summary

ID of the work item.

# flags.target-org.summary

Username or alias of the DevOps Center org.

# examples

- Create a pull request for a work item.

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --work-item-name WI-000001

- Create a pull request using the work item ID.

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --work-item-id 0Wx000000000001

# error.NoBranch

Work item %s doesn't have an associated branch. Mark the work item as In Progress to create a branch, then try again.
