# summary

Update a work item in DevOps Center.

# description

Update the subject, description, or status of a work item. At least one of --subject, --description, or --status must be provided.

# flags.work-item-name.summary

Name of the work item, such as WI-000001.

# flags.work-item-id.summary

ID of the work item.

# flags.subject.summary

New subject for the work item.

# flags.description.summary

New description for the work item.

# flags.status.summary

New status for the work item. Allowed values: "In Progress", "Ready to Promote".

# examples

- Update the subject of a work item by name:

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --work-item-name WI-000001 --subject "Fix login bug"

- Update the status of a work item by ID:

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --work-item-id 0Wx000000000001 --status "In Progress"

- Update multiple fields at once:

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --work-item-name WI-000001 --subject "Fix login bug" --description "Users can't log in on mobile" --status "In Progress"

# error.NoFieldsProvided

Provide at least one of --subject, --description, or --status.
