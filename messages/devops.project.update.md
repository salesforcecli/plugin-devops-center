# summary

Update a DevOps Center project.

# description

Update the name, description, or active status of a DevOps Center project. At least one of --name, --description, or --is-active must be provided.

# flags.project-id.summary

ID of the DevOps Center project to update.

# flags.name.summary

New name for the project.

# flags.description.summary

New description for the project.

# flags.is-active.summary

Set the project active status. Use --is-active to activate or --no-is-active to deactivate.

# examples

- Rename a project:

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --project-id 1Qg000000000001 --name "MyApp Release v2"

- Update the description of a project:

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --project-id 1Qg000000000001 --description "Updated release description"

- Deactivate a project:

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --project-id 1Qg000000000001 --no-is-active

- Update all fields at once:

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --project-id 1Qg000000000001 --name "Archived App" --description "Archived" --no-is-active

# error.NoFieldsProvided

Provide at least one of --name, --description, or --is-active/--no-is-active.
