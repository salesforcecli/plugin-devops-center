# summary

Prepare work items to be combined for custom promotion.

# description

Use this command when work items in the same stage share metadata or have dependencies. DevOps Center combines the selected work items so they can be promoted together during custom promotion.

After running this command, use "sf devops work-item promote" with the parent work item ID to complete the promotion. The combined work items are promoted as a single unit.

# flags.parent-work-item-id.summary

ID of the parent work item.

# flags.parent-work-item-id.description

The parent work item is the primary work item that continues through the pipeline. Changes from all child work items are merged into the parent's branch during promotion.

# flags.child-work-item-id.summary

ID of a work item to combine.

# flags.child-work-item-id.description

Specify this flag multiple times to combine multiple work items with the parent.

# flags.target-stage-id.summary

ID of the pipeline stage to promote the combined work item to.

# examples

- Prepare three work items to be combined to prevent conflicts during promotion:

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --parent-work-item-id 0Wx000000000001 --child-work-item-id 0Wx000000000002 --child-work-item-id 0Wx000000000003 --target-stage-id 05S000000000002

# error.NoPipeline

No pipeline found for this project. Ensure the project has an associated pipeline.
