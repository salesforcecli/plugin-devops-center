# summary

List all work items for a DevOps Center project.

# description

Each work item displays the branch, environment, and repository details needed for checkout and promotion. Requires a project ID; run the `devops project list` command to get the IDs for all existing projects.

# flags.project-id.summary

ID of the DevOps Center project to list work items for.

# examples

- List work items for a specific project in the DevOps org with alias "my-devops-org":

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --project-id 0Hn000000000001

- List work items using JSON output:

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --project-id 0Hn000000000001 --json
