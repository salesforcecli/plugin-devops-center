# summary

List all work items for a DevOps Center project.

# description

Lists work items from a Salesforce DevOps Center project. Each work item includes branch, environment, and repository details needed for checkout and promotion. Requires a project ID which can be obtained from `sf devops project list`.

# flags.target-org.summary

Username or alias of the DevOps Center org.

# flags.project-id.summary

ID of the DevOps Center project to list work items for.

# examples

- List work items for a specific project.

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --project-id 0Hn000000000001

- List work items with JSON output.

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --project-id 0Hn000000000001 --json
