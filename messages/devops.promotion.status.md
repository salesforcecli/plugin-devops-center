# summary

Get the status of a promotion request.

# description

Returns the current status of a promotion identified by its request token.

# flags.request-token.summary

Request token from the promote response.

# examples

- Get the status of a promotion:

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --request-token a0B000000000001

# error.RequestNotFound

Promotion request %s not found. Check the request token and try again.
