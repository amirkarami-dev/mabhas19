using Mabhas19.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Mabhas19.Infrastructure.Data.Configurations;

public class AssessmentConfiguration : IEntityTypeConfiguration<Assessment>
{
    public void Configure(EntityTypeBuilder<Assessment> builder)
    {
        builder.Property(a => a.InputJson).HasColumnType("jsonb").IsRequired();
        builder.Property(a => a.ResultJson).HasColumnType("jsonb").IsRequired();
        builder.Property(a => a.Status).HasConversion<int>();

        builder.HasIndex(a => a.ProjectId).IsUnique();

        builder.HasMany(a => a.Reports)
            .WithOne(r => r.Assessment)
            .HasForeignKey(r => r.AssessmentId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
