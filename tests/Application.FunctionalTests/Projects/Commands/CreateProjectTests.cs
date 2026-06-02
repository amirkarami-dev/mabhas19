using Mabhas19.Application.Projects.Commands.CreateProject;
using Mabhas19.Domain.Entities;
using AppValidationException = Mabhas19.Application.Common.Exceptions.ValidationException;

namespace Mabhas19.Application.FunctionalTests.Projects.Commands;

using static TestApp;

public class CreateProjectTests : TestBase
{
    [Test]
    public async Task ShouldRequireTitle()
    {
        await RunAsDefaultUserAsync();

        var command = new CreateProjectCommand { Title = "", City = "تهران" };

        await Should.ThrowAsync<AppValidationException>(() => SendAsync(command));
    }

    [Test]
    public async Task ShouldCreateProjectForOwner()
    {
        var userId = await RunAsDefaultUserAsync();

        var id = await SendAsync(new CreateProjectCommand
        {
            Title = "ساختمان نمونه",
            City = "تهران",
            TotalArea = 1200,
            FloorCount = 5,
            UnitCount = 10
        });

        id.ShouldBeGreaterThan(0);

        var project = await FindAsync<Project>(id);
        project.ShouldNotBeNull();
        project!.Title.ShouldBe("ساختمان نمونه");
        project.OwnerId.ShouldBe(userId);
        // City "تهران" has no explicit ClimateCode override, so the handler resolves it.
        project.ClimateCode.ShouldNotBeNullOrWhiteSpace();
    }

    [Test]
    public async Task ShouldEnforceFreePlanProjectCap()
    {
        await RunAsDefaultUserAsync();

        // A Free subscription is created on first use with DefaultMaxProjects (5).
        for (var i = 0; i < Subscription.DefaultMaxProjects; i++)
        {
            await SendAsync(new CreateProjectCommand { Title = $"پروژه {i}", City = "تهران" });
        }

        var overLimit = new CreateProjectCommand { Title = "بیش از حد", City = "تهران" };

        var ex = await Should.ThrowAsync<AppValidationException>(() => SendAsync(overLimit));
        ex.Errors.ShouldContainKey("Subscription");

        (await CountAsync<Project>()).ShouldBe(Subscription.DefaultMaxProjects);
    }
}
