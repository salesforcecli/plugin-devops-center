# summary

Update the status of a work item in DevOps Center.

# description

Allowed statuses are "In Progress" and "Ready to Promote".

# flags.work-item-name.summary

Name of the work item, such as WI-000001.

# flags.work-item-id.summary

ID of the work item.

# flags.status.summary

Status to set for the work item. Allowed values: "In Progress", "Ready to Promote".

# examples

- Update a work item status by its name to indicate the work is underway:

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --work-item-name WI-000001 --status "In Progress"

- Update a work item status by its ID to indicate the changes are ready for promotion:

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --work-item-id 0Wx000000000001 --status "Ready to Promote"
