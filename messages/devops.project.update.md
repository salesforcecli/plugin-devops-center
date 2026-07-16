# summary

Update a DevOps Center project.

# description

Update the description or active status of a DevOps Center project. At least one of --description or --is-active must be provided.

# flags.project-name.summary

Name of the DevOps Center project to update.

# flags.project-id.summary

ID of the DevOps Center project to update.

# flags.description.summary

New description for the project.

# flags.is-active.summary

Set the project active status. Use --is-active to activate or --no-is-active to deactivate.

# examples

- Update the description of a project by name:

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --project-name "MyApp Release" --description "Updated release description"

- Deactivate a project by ID:

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --project-id 1Qg000000000001 --no-is-active

- Update both description and active status:

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --project-name "MyApp Release" --description "Archived" --no-is-active

# error.NoFieldsProvided

Provide at least one of --description or --is-active/--no-is-active.
