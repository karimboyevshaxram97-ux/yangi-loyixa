import Errors, { HttpCode, Message } from "../libs/types/errors";
import { View, ViewInput } from "../libs/types/view";
import ViewModel from "../schema/View.model";

class ViewService {
  private readonly viewModel;

  constructor() {
    this.viewModel = ViewModel;
  }

  public async checkViewExistence(input: ViewInput): Promise<View> {
    return await this.viewModel
      .findOne({
        memberId: input.memberId,
        viewRefId: input.viewRefId,
        viewGroup: input.viewGroup,
      })
      .exec();
  }

  public async insertMemberView(input: ViewInput): Promise<View> {
    try {
      return await this.viewModel.create(input);
    } catch (err) {
      console.log("ERROR, model:insertMemberView:", err);
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    }
  }

  public async deleteView(input: ViewInput): Promise<void> {
    await this.viewModel
      .deleteOne({
        memberId: input.memberId,
        viewRefId: input.viewRefId,
        viewGroup: input.viewGroup,
      })
      .exec();
  }

  public async getMemberViewRefIds(
    memberId: ViewInput["memberId"],
    viewGroup: ViewInput["viewGroup"]
  ): Promise<string[]> {
    const views = await this.viewModel
      .find({ memberId, viewGroup })
      .lean()
      .exec();
    return views.map((view: any) => String(view.viewRefId));
  }
}

export default ViewService;