using Microsoft.Extensions.Diagnostics.HealthChecks;
using MongoDB.Bson;

namespace RAGnosis.Api.Data;

/// <summary>
/// Readiness probe for MongoDB. The API can be alive but unable to serve anything useful
/// when the database is unreachable, so an orchestrator should stop routing traffic here
/// without also restarting the process.
/// </summary>
public sealed class MongoHealthCheck(MongoContext context) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext healthCheckContext, CancellationToken cancellationToken = default)
    {
        try
        {
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeout.CancelAfter(TimeSpan.FromSeconds(3));

            await context.Database.RunCommandAsync<BsonDocument>(
                new BsonDocument("ping", 1), cancellationToken: timeout.Token);

            return HealthCheckResult.Healthy("MongoDB is reachable.");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("MongoDB is unreachable.", ex);
        }
    }
}
