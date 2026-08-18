using Microsoft.Extensions.Options;
using MongoDB.Driver;
using RAGnosis.Api.Configuration;
using RAGnosis.Api.Models;

namespace RAGnosis.Api.Data;

/// <summary>
/// Thin wrapper over the Mongo database. Collection names deliberately match the
/// original data model so an existing database can be pointed at this API unchanged.
/// </summary>
public sealed class MongoContext
{
    public IMongoDatabase Database { get; }

    public MongoContext(IOptions<MongoSettings> options)
    {
        var settings = options.Value;
        var client = new MongoClient(settings.ConnectionString);
        Database = client.GetDatabase(settings.Database);
    }

    public IMongoCollection<User> Users => Database.GetCollection<User>("users");
    public IMongoCollection<Report> Reports => Database.GetCollection<Report>("reports");
    public IMongoCollection<Reminder> Reminders => Database.GetCollection<Reminder>("reminders");
    public IMongoCollection<Appointment> Appointments => Database.GetCollection<Appointment>("appointments");
    public IMongoCollection<Prescription> Prescriptions => Database.GetCollection<Prescription>("prescriptions");
    public IMongoCollection<ChatMessage> ChatMessages => Database.GetCollection<ChatMessage>("chat_messages");
    public IMongoCollection<KnowledgeChunk> KnowledgeChunks => Database.GetCollection<KnowledgeChunk>("knowledge_chunks");
}

/// <summary>Creates the indexes the API relies on. Safe to run on every start.</summary>
public sealed class MongoIndexInitializer(MongoContext context, ILogger<MongoIndexInitializer> logger)
{
    public async Task EnsureIndexesAsync(CancellationToken ct = default)
    {
        try
        {
            await context.Users.Indexes.CreateOneAsync(
                new CreateIndexModel<User>(
                    Builders<User>.IndexKeys.Ascending(u => u.Email),
                    new CreateIndexOptions { Unique = true, Name = "ux_users_email" }),
                cancellationToken: ct);

            await context.Reports.Indexes.CreateManyAsync(
            [
                new CreateIndexModel<Report>(
                    Builders<Report>.IndexKeys.Ascending(r => r.UserId).Descending(r => r.UploadedAt),
                    new CreateIndexOptions { Name = "ix_reports_user_uploaded" })
            ], cancellationToken: ct);

            await context.Reminders.Indexes.CreateOneAsync(
                new CreateIndexModel<Reminder>(
                    Builders<Reminder>.IndexKeys.Ascending(r => r.UserId).Ascending(r => r.IsActive),
                    new CreateIndexOptions { Name = "ix_reminders_user_active" }),
                cancellationToken: ct);

            await context.Appointments.Indexes.CreateManyAsync(
            [
                new CreateIndexModel<Appointment>(
                    Builders<Appointment>.IndexKeys.Ascending(a => a.DoctorId).Ascending(a => a.ScheduledFor),
                    new CreateIndexOptions { Name = "ix_appointments_doctor_slot" }),
                new CreateIndexModel<Appointment>(
                    Builders<Appointment>.IndexKeys.Ascending(a => a.PatientId).Descending(a => a.ScheduledFor),
                    new CreateIndexOptions { Name = "ix_appointments_patient" })
            ], cancellationToken: ct);

            await context.ChatMessages.Indexes.CreateOneAsync(
                new CreateIndexModel<ChatMessage>(
                    Builders<ChatMessage>.IndexKeys.Ascending(m => m.UserId).Ascending(m => m.ReportId).Ascending(m => m.CreatedAt),
                    new CreateIndexOptions { Name = "ix_chat_thread" }),
                cancellationToken: ct);

            logger.LogInformation("Mongo indexes ensured.");
        }
        catch (Exception ex)
        {
            // A missing database at boot shouldn't stop the API from starting.
            logger.LogWarning(ex, "Could not ensure Mongo indexes. The API will continue to start.");
        }
    }
}
