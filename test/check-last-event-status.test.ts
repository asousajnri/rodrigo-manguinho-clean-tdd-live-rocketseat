import { set, reset } from "mockdate";

type TEvent = {
  endDate: Date;
  reviewDurationInHours: number;
};

type TInput = {
  groupId: string;
};

type TOutput = TEvent;

class EventStatus {
  status: "active" | "inReview" | "done";
  constructor(event?: TEvent) {
    if (event == undefined) {
      this.status = "done";
      return;
    }
    const now = new Date();
    if (event.endDate >= now) {
      this.status = "active";
      return;
    }
    const reviewDurationInMs = event.reviewDurationInHours * 60 * 60 * 1000;
    const reviewDate = new Date(event.endDate.getTime() + reviewDurationInMs);
    this.status = reviewDate >= now ? "inReview" : "done";
  }
}

interface LoadLastEventRepository {
  loadLastEvent: (input: TInput) => Promise<TOutput | undefined>;
}

class CheckLastEventStatus {
  constructor(
    private readonly loadLastEventRepository: LoadLastEventRepository
  ) {}
  async execute(input: TInput): Promise<EventStatus> {
    const event = await this.loadLastEventRepository.loadLastEvent(input);
    return new EventStatus(event);
  }
}

type SutOutput = {
  sut: CheckLastEventStatus;
  loadLastEventRepository: LoadLastEventRepositorySpy;
};

const makeSut = (): SutOutput => {
  const loadLastEventRepository = new LoadLastEventRepositorySpy();
  const sut = new CheckLastEventStatus(loadLastEventRepository);
  return { sut, loadLastEventRepository };
};

class LoadLastEventRepositorySpy implements LoadLastEventRepository {
  groupId?: string;
  callsCount = 0;
  output?: TOutput;
  async loadLastEvent(input: TInput): Promise<TOutput | undefined> {
    this.groupId = input.groupId;
    this.callsCount++;
    return this.output;
  }
}

describe("CheckLastEventStatus", () => {
  it("should get last event data", async () => {
    // Arrange
    const { sut, loadLastEventRepository } = makeSut();

    // Act
    await sut.execute({ groupId: "any_group_id" });

    // Assert
    expect(loadLastEventRepository.groupId).toBe("any_group_id");
    expect(loadLastEventRepository.callsCount).toBe(1);
  });
  it("should return status done when group has no event", async () => {
    // Arrange
    const { sut } = makeSut();

    // Act
    const eventStatus = await sut.execute({ groupId: "any_group_id" });

    // Assert
    expect(eventStatus.status).toBe("done");
  });
  it("should return status active when now is before event end time", async () => {
    // Arrange
    const { sut, loadLastEventRepository } = makeSut();
    loadLastEventRepository.output = {
      endDate: new Date(new Date().getTime() + 1),
      reviewDurationInHours: 1,
    };

    // Act
    const eventStatus = await sut.execute({ groupId: "any_group_id" });

    // Assert
    expect(eventStatus.status).toBe("active");
  });
  it("should return status active when now is equal event end time", async () => {
    // Arrange
    const { sut, loadLastEventRepository } = makeSut();
    loadLastEventRepository.output = {
      endDate: new Date(),
      reviewDurationInHours: 1,
    };

    // Act
    const eventStatus = await sut.execute({ groupId: "any_group_id" });

    // Assert
    expect(eventStatus.status).toBe("active");
  });
  it("should return status inReview when now is after event end time", async () => {
    // Arrange
    const { sut, loadLastEventRepository } = makeSut();
    loadLastEventRepository.output = {
      endDate: new Date(new Date().getTime() - 1),
      reviewDurationInHours: 1,
    };

    // Act
    const eventStatus = await sut.execute({ groupId: "any_group_id" });

    // Assert
    expect(eventStatus.status).toBe("inReview");
  });
  it("should return status inReview when now is before review time", async () => {
    // Arrange
    const { sut, loadLastEventRepository } = makeSut();
    const reviewDurationInHours = 1;
    const reviewDurationInMs = reviewDurationInHours * 60 * 60 * 1000;
    loadLastEventRepository.output = {
      endDate: new Date(new Date().getTime() - reviewDurationInMs + 1),
      reviewDurationInHours,
    };

    // Act
    const eventStatus = await sut.execute({ groupId: "any_group_id" });

    // Assert
    expect(eventStatus.status).toBe("inReview");
  });
  it("should return status inReview when now is equal to review time", async () => {
    // Arrange
    const { sut, loadLastEventRepository } = makeSut();
    const reviewDurationInHours = 1;
    const reviewDurationInMs = reviewDurationInHours * 60 * 60 * 1000;
    loadLastEventRepository.output = {
      endDate: new Date(new Date().getTime() - reviewDurationInMs),
      reviewDurationInHours,
    };

    // Act
    const eventStatus = await sut.execute({ groupId: "any_group_id" });

    // Assert
    expect(eventStatus.status).toBe("inReview");
  });
  it("should return status done when now is after to review time", async () => {
    // Arrange
    const { sut, loadLastEventRepository } = makeSut();
    const reviewDurationInHours = 1;
    const reviewDurationInMs = reviewDurationInHours * 60 * 60 * 1000;
    loadLastEventRepository.output = {
      endDate: new Date(new Date().getTime() - reviewDurationInMs - 1),
      reviewDurationInHours,
    };

    // Act
    const eventStatus = await sut.execute({ groupId: "any_group_id" });

    // Assert
    expect(eventStatus.status).toBe("done");
  });
});
