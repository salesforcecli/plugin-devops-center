# summary

Create a new work item in a DevOps Center project.

# description

The command creates the work item using the Connect API. Requires a project ID and a subject for the new work item; run the `devops project list` command to get the IDs for all existing projects. 

# flags.target-org.summary

Username or alias of the DevOps Center org.

# flags.project-id.summary

ID of the DevOps Center project to create the work item in.

# flags.subject.summary

Subject (title) of the new work item.

# flags.description.summary

Description of the new work item.

# examples

- Create a work item with a subject.

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --project-id 0Hn000000000001 --subject "Fix login bug"

- Create a work item with a subject and description:

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --project-id 0Hn000000000001 --subject "Add dark mode" --description "Implement dark mode toggle in settings page"
