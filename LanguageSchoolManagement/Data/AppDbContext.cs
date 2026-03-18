using LanguageSchoolManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace LanguageSchoolManagement.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<StudentProfile> StudentProfiles => Set<StudentProfile>();
    public DbSet<Course> Courses => Set<Course>();
    public DbSet<Enrollment> Enrollments => Set<Enrollment>();
    public DbSet<CourseRequest> CourseRequests => Set<CourseRequest>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<StudentNumberSequence> StudentNumberSequences => Set<StudentNumberSequence>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.Email).IsUnique();
        });

        modelBuilder.Entity<StudentProfile>(e =>
        {
            e.HasKey(x => x.UserId);
            e.HasOne(x => x.User)
                .WithOne(x => x.StudentProfile)
                .HasForeignKey<StudentProfile>(x => x.UserId);
        });

        modelBuilder.Entity<Course>(e => e.HasKey(x => x.Id));

        modelBuilder.Entity<Enrollment>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasOne(x => x.User).WithMany(u => u.Enrollments).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Course).WithMany().HasForeignKey(x => x.CourseId).OnDelete(DeleteBehavior.Restrict);
            // Only one active enrollment per user per course; multiple inactive records allowed.
            // SQLite: partial index WHERE IsActive (true = non-zero integer)
            e.HasIndex(x => new { x.UserId, x.CourseId })
                .IsUnique()
                .HasFilter("IsActive");
        });

        modelBuilder.Entity<CourseRequest>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasOne(x => x.User).WithMany(u => u.CourseRequests).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Course).WithMany().HasForeignKey(x => x.CourseId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<StudentNumberSequence>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).ValueGeneratedOnAdd();
        });

        modelBuilder.Entity<Message>(e =>
        {
            e.HasKey(x => x.Id);

            e.HasOne<User>()
                .WithMany()
                .HasForeignKey(x => x.SenderUserId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne<User>()
                .WithMany()
                .HasForeignKey(x => x.ReceiverUserId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne<User>()
                .WithMany()
                .HasForeignKey(x => x.ReviewedBy)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
